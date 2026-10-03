import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { schema } from '@xfield/db';
import type { CredentialsInput } from '@xfield/shared';
import { and, eq, gt, lt } from 'drizzle-orm';
import { SESSION_TTL_MS } from '../config.ts';
import type { Dependencies } from '../shared/context.ts';
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
export async function findSession({ db }: Dependencies, token: string) {
  const [row] = await db
    .select({ workspaceId: users.workspaceId, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, digest(token)), gt(sessions.expires, Date.now())));
  return row ?? null;
}

/** True when a guest workspace id has been adopted by an account. */
export async function isClaimed({ db }: Dependencies, workspaceId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.workspaceId, workspaceId));
  return row !== undefined;
}

/**
 * Creates an account that adopts the caller's guest workspace, so everything
 * made before signing up is kept.
 */
export async function signUp(
  deps: Dependencies,
  guestWorkspaceId: string,
  { email, password }: CredentialsInput,
): Promise<string> {
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

export async function signIn(
  deps: Dependencies,
  { email, password }: CredentialsInput,
): Promise<string> {
  const [user] = await deps.db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email));
  const valid = await verifyPassword(password, user?.passwordHash ?? (await decoyHash));
  if (!user || !valid) throw new HttpError(401, INVALID_CREDENTIALS);
  return startSession(deps, user.id);
}

export const signOut = ({ db }: Dependencies, token: string) =>
  db.delete(sessions).where(eq(sessions.id, digest(token)));
