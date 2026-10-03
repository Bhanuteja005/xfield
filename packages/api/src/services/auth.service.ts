import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { schema } from '@xfield/db';
import type { CredentialsInput } from '@xfield/shared';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { SESSION_TTL_MS } from '../config.ts';
import type { Identity, IdentityUser, OAuthProvider } from '../infrastructure/identity/types.ts';
import type { AuthDependencies as Dependencies } from '../shared/context.ts';
import { HttpError } from '../shared/http.ts';

const { sessions, users } = schema;
const derive = promisify(scrypt);
const KEY_BYTES = 64;
const INVALID_CREDENTIALS = 'Email or password is incorrect.';

/** `scrypt$<salt>$<hash>`, both base64url. The salt is unique per password. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await derive(password, salt, KEY_BYTES)) as Buffer;
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = (await derive(password, Buffer.from(salt, 'base64url'), KEY_BYTES)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// Verified against when the email is unknown, so both outcomes cost the same time.
const decoyHash = hashPassword(randomBytes(16).toString('hex'));

/** Only the digest is stored, so a database leak does not expose live sessions. */
const digest = (token: string) => createHash('sha256').update(token).digest('base64url');

async function startSession({ db }: Dependencies, userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expires, now)));
  await db.insert(sessions).values({ id: digest(token), userId, expires: now + SESSION_TTL_MS });
  return token;
}

/** The account behind a session token, or null when it is unknown or expired. */
export async function findSession({ db }: Pick<Dependencies, 'db'>, token: string) {
  const [row] = await db
    .select({ workspaceId: users.workspaceId, email: users.email, onboarding: users.onboarding })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, digest(token)), gt(sessions.expires, Date.now())));
  if (!row) return null;
  return {
    workspaceId: row.workspaceId,
    email: row.email,
    needsOnboarding: row.onboarding === null,
  };
}

/** True when a guest workspace id has been adopted by an account. */
export async function isClaimed(
  { db }: Pick<Dependencies, 'db'>,
  workspaceId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.workspaceId, workspaceId));
  return row !== undefined;
}

const newWorkspaceId = () => `w_${crypto.randomUUID()}`;

function requireIdentity({ identity }: Dependencies): Identity {
  if (!identity) throw new HttpError(404, 'This sign-in method is not available.');
  return identity;
}

/**
 * The local account for a user the identity provider vouched for. The first
 * time, it adopts the caller's guest workspace so earlier work is kept.
 */
async function ensureAccount(
  { db }: Dependencies,
  user: IdentityUser,
  guestWorkspaceId: string | null,
): Promise<string> {
  const [linked] = await db.select({ id: users.id }).from(users).where(eq(users.authId, user.id));
  if (linked) return linked.id;

  // An account created before Supabase Auth was enabled keeps its workspace.
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, user.email), isNull(users.authId)));
  if (existing) {
    await db.update(users).set({ authId: user.id }).where(eq(users.id, existing.id));
    return existing.id;
  }

  const id = crypto.randomUUID();
  const created = await db
    .insert(users)
    .values({
      id,
      email: user.email,
      authId: user.id,
      workspaceId: guestWorkspaceId ?? newWorkspaceId(),
      created: Date.now(),
    })
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (created.length) return id;
  // A concurrent request for the same user created the row first.
  const [raced] = await db.select({ id: users.id }).from(users).where(eq(users.authId, user.id));
  if (!raced) throw new HttpError(409, 'An account with this email already exists.');
  return raced.id;
}

/**
 * With Supabase Auth the account starts unverified and null is returned; the
 * session begins once the emailed code is confirmed. Locally the account
 * adopts the guest workspace and a session token is returned straight away.
 */
export async function signUp(
  deps: Dependencies,
  guestWorkspaceId: string,
  { email, password }: CredentialsInput,
  redirectTo: string,
): Promise<string | null> {
  if (deps.identity) {
    await deps.identity.signUp(email, password, redirectTo);
    return null;
  }
  const id = crypto.randomUUID();
  const created = await deps.db
    .insert(users)
    .values({
      id,
      email,
      passwordHash: await hashPassword(password),
      workspaceId: guestWorkspaceId,
      created: Date.now(),
    })
    .onConflictDoNothing()
    .returning({ id: users.id });
  if (!created.length) throw new HttpError(409, 'An account with this email already exists.');
  return startSession(deps, id);
}

export async function verifySignUp(
  deps: Dependencies,
  guestWorkspaceId: string | null,
  email: string,
  code: string,
): Promise<string> {
  const user = await requireIdentity(deps).verifySignUp(email, code);
  return startSession(deps, await ensureAccount(deps, user, guestWorkspaceId));
}

export const resendVerification = (deps: Dependencies, email: string, redirectTo: string) =>
  requireIdentity(deps).resendVerification(email, redirectTo);

export const sendPasswordReset = (deps: Dependencies, email: string, redirectTo: string) =>
  requireIdentity(deps).sendPasswordReset(email, redirectTo);

/** Signs in from the access token an email confirmation link delivers. */
export async function signInWithAccessToken(
  deps: Dependencies,
  guestWorkspaceId: string | null,
  accessToken: string,
): Promise<string> {
  const user = await requireIdentity(deps).userFromAccessToken(accessToken);
  return startSession(deps, await ensureAccount(deps, user, guestWorkspaceId));
}

/** Sets a new password from a recovery link's access token and signs in. */
export async function resetPassword(
  deps: Dependencies,
  guestWorkspaceId: string | null,
  accessToken: string,
  password: string,
): Promise<string> {
  const identity = requireIdentity(deps);
  const user = await identity.userFromAccessToken(accessToken);
  await identity.setPassword(user.id, password);
  return startSession(deps, await ensureAccount(deps, user, guestWorkspaceId));
}

/** PKCE: the verifier stays with the browser, only its hash goes to the provider. */
export function startOAuth(deps: Dependencies, provider: OAuthProvider, redirectTo: string) {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { url: requireIdentity(deps).oauthUrl(provider, redirectTo, challenge), verifier };
}

export async function finishOAuth(
  deps: Dependencies,
  guestWorkspaceId: string | null,
  code: string,
  verifier: string,
): Promise<string> {
  const user = await requireIdentity(deps).exchangeCode(code, verifier);
  return startSession(deps, await ensureAccount(deps, user, guestWorkspaceId));
}

export async function signIn(
  deps: Dependencies,
  guestWorkspaceId: string | null,
  { email, password }: CredentialsInput,
): Promise<string> {
  if (deps.identity) {
    const user = await deps.identity.signIn(email, password);
    return startSession(deps, await ensureAccount(deps, user, guestWorkspaceId));
  }
  const [user] = await deps.db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email));
  const valid = await verifyPassword(password, user?.passwordHash ?? (await decoyHash));
  if (!user || !valid) throw new HttpError(401, INVALID_CREDENTIALS);
  return startSession(deps, user.id);
}

/** Records onboarding answers; an empty object marks it as skipped. */
export async function saveOnboarding(
  { db }: Pick<Dependencies, 'db'>,
  email: string,
  answers: Record<string, string | string[]>,
) {
  await db.update(users).set({ onboarding: answers }).where(eq(users.email, email));
}

export const signOut = ({ db }: Dependencies, token: string) =>
  db.delete(sessions).where(eq(sessions.id, digest(token)));
