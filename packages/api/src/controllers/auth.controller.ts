import {
  accessTokenInput,
  credentialsInput,
  emailInput,
  passwordResetInput,
  signUpInput,
  verifyInput,
  type AuthProviders,
  type SignUpResult,
} from '@xfield/shared';
import { OAUTH_COOKIE, OAUTH_COOKIE_MAX_AGE_SECONDS } from '../config.ts';
import type { OAuthProvider } from '../infrastructure/identity/types.ts';
import { sessionCookie } from '../middlewares/session.ts';
import * as authService from '../services/auth.service.ts';
import type { Controller, RequestContext } from '../shared/context.ts';
import { HttpError, isSecure, json, readCookie, serializeCookie } from '../shared/http.ts';

const OAUTH_PROVIDERS: OAuthProvider[] = ['google'];

/** Where email links land: a page that hands the token in the URL fragment back to us. */
const linkTarget = (context: RequestContext) => `${context.url.origin}/auth/callback`;

/** A signed-in caller's workspace already belongs to an account and cannot be adopted. */
const guestWorkspace = (context: RequestContext) => (context.email ? null : context.workspaceId);

const signedIn = (context: RequestContext, token: string, email: string | null, status = 200) =>
  json({ email }, status, { 'Set-Cookie': sessionCookie(context.request, token) });

const oauthCookie = (context: RequestContext, value: string, maxAgeSeconds: number) =>
  serializeCookie(OAUTH_COOKIE, value, {
    sameSite: 'Lax',
    secure: isSecure(context.request),
    maxAgeSeconds,
  });

const redirect = (location: string, cookies: string[] = []) => {
  const headers = new Headers({ Location: location, 'Cache-Control': 'no-store' });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
};

export const providers: Controller = async (context) => {
  const available: AuthProviders = context.identity
    ? await context.identity.providers()
    : { verification: false, recovery: false, google: false };
  return json(available);
};

export const signUp: Controller = async (context) => {
  if (context.email) throw new HttpError(409, 'You are already signed in.');
  const credentials = signUpInput.parse(await context.request.json());
  const token = await authService.signUp(
    context,
    context.workspaceId,
    credentials,
    linkTarget(context),
  );
  const result: SignUpResult = { email: credentials.email, pending: token === null };
  if (token === null) return json(result, 202);
  return json(result, 201, { 'Set-Cookie': sessionCookie(context.request, token) });
};

export const verify: Controller = async (context) => {
  const { email, code } = verifyInput.parse(await context.request.json());
  const token = await authService.verifySignUp(context, guestWorkspace(context), email, code);
  return signedIn(context, token, email);
};

export const resend: Controller = async (context) => {
  const { email } = emailInput.parse(await context.request.json());
  await authService.resendVerification(context, email, linkTarget(context));
  return json({ ok: true });
};

export const signIn: Controller = async (context) => {
  const credentials = credentialsInput.parse(await context.request.json());
  const token = await authService.signIn(context, guestWorkspace(context), credentials);
  return signedIn(context, token, credentials.email);
};

export const recover: Controller = async (context) => {
  const { email } = emailInput.parse(await context.request.json());
  await authService.sendPasswordReset(context, email, linkTarget(context));
  return json({ ok: true });
};

export const signInWithLink: Controller = async (context) => {
  const { accessToken } = accessTokenInput.parse(await context.request.json());
  const token = await authService.signInWithAccessToken(
    context,
    guestWorkspace(context),
    accessToken,
  );
  return signedIn(context, token, null);
};

export const resetPassword: Controller = async (context) => {
  const { accessToken, password } = passwordResetInput.parse(await context.request.json());
  const token = await authService.resetPassword(
    context,
    guestWorkspace(context),
    accessToken,
    password,
  );
  return signedIn(context, token, null);
};

export const startOAuth: Controller = (context) => {
  const provider = context.params.provider as OAuthProvider;
  if (!OAUTH_PROVIDERS.includes(provider)) throw new HttpError(404, 'Unknown sign-in provider.');
  const { url, verifier } = authService.startOAuth(
    context,
    provider,
    `${context.url.origin}/api/auth/callback`,
  );
  return redirect(url, [oauthCookie(context, verifier, OAUTH_COOKIE_MAX_AGE_SECONDS)]);
};

export const finishOAuth: Controller = async (context) => {
  const clear = oauthCookie(context, '', 0);
  const code = context.url.searchParams.get('code');
  const verifier = readCookie(context.request, OAUTH_COOKIE);
  const failed = (message: string) =>
    redirect(`/explore?auth_error=${encodeURIComponent(message)}`, [clear]);
  if (!code || !verifier)
    return failed(context.url.searchParams.get('error_description') ?? 'Sign-in was cancelled.');
  try {
    const token = await authService.finishOAuth(context, guestWorkspace(context), code, verifier);
    return redirect('/explore?auth=signed-in', [clear, sessionCookie(context.request, token)]);
  } catch (error) {
    return failed(error instanceof HttpError ? error.message : 'Sign-in failed. Try again.');
  }
};

export const signOut: Controller = async (context) => {
  if (context.sessionToken) await authService.signOut(context, context.sessionToken);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(context.request, '', 0) });
};
