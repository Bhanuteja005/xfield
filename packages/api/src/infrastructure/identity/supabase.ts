import { createClient, type AuthError, type User } from '@supabase/supabase-js';
import type { AuthProviders } from '@xfield/shared';
import { HttpError } from '../../shared/http.ts';
import type { Identity, IdentityUser } from './types.ts';

const INVALID_CREDENTIALS = 'Email or password is incorrect.';
const SETTINGS_TTL_MS = 60_000;

/** Supabase's error codes mapped to responses that are safe to show. */
function toHttpError(error: AuthError): HttpError {
  switch (error.code) {
    case 'invalid_credentials':
      return new HttpError(401, INVALID_CREDENTIALS);
    case 'email_not_confirmed':
      return new HttpError(403, 'Verify your email first. Enter the code we emailed you.');
    case 'user_already_exists':
    case 'email_exists':
      return new HttpError(409, 'An account with this email already exists.');
    case 'otp_expired':
      return new HttpError(400, 'That code is invalid or has expired. Request a new one.');
    case 'weak_password':
      return new HttpError(400, error.message);
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return new HttpError(429, 'Too many attempts. Wait a minute and try again.');
    case 'signup_disabled':
      return new HttpError(403, 'New sign-ups are closed.');
    case 'bad_jwt':
    case 'session_not_found':
    case 'user_not_found':
      return new HttpError(401, 'This link has expired. Request a new one.');
    default:
      return error.status && error.status < 500
        ? new HttpError(400, error.message)
        : new HttpError(502, 'The sign-in service is unavailable. Try again shortly.');
  }
}

function toUser(user: Pick<User, 'id' | 'email'> | null | undefined): IdentityUser {
  if (!user?.email) throw new HttpError(502, 'The sign-in service returned no account.');
  return { id: user.id, email: user.email.toLowerCase() };
}

export function createSupabaseIdentity(url: string, serviceKey: string): Identity {
  // A fresh client per call keeps one caller's session out of another's requests.
  const auth = () =>
    createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }).auth;
  let settings: { value: AuthProviders; expires: number } | undefined;

  return {
    async signUp(email, password, redirectTo) {
      const { data, error } = await auth().signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw toHttpError(error);
      // An existing verified email comes back as a user with no identities.
      if (data.user?.identities?.length === 0)
        throw new HttpError(409, 'An account with this email already exists.');
    },

    async signIn(email, password) {
      const { data, error } = await auth().signInWithPassword({ email, password });
      if (error) throw toHttpError(error);
      return toUser(data.user);
    },

    async verifySignUp(email, code) {
      const { data, error } = await auth().verifyOtp({ email, token: code, type: 'email' });
      if (error) throw toHttpError(error);
      return toUser(data.user);
    },

    async resendVerification(email, redirectTo) {
      const { error } = await auth().resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw toHttpError(error);
    },

    async sendPasswordReset(email, redirectTo) {
      const { error } = await auth().resetPasswordForEmail(email, { redirectTo });
      // Unknown emails are not reported, so this cannot be used to find accounts.
      if (error && error.code !== 'user_not_found') throw toHttpError(error);
    },

    async userFromAccessToken(accessToken) {
      const { data, error } = await auth().getUser(accessToken);
      if (error) throw toHttpError(error);
      return toUser(data.user);
    },

    async setPassword(userId, password) {
      const { error } = await auth().admin.updateUserById(userId, { password });
      if (error) throw toHttpError(error);
    },

    async providers() {
      if (settings && settings.expires > Date.now()) return settings.value;
      const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: serviceKey } });
      if (!response.ok) throw new HttpError(502, 'The sign-in service is unavailable.');
      const body = (await response.json()) as {
        external?: Record<string, boolean>;
        mailer_autoconfirm?: boolean;
      };
      const value: AuthProviders = {
        verification: !body.mailer_autoconfirm,
        recovery: true,
        google: body.external?.google === true,
      };
      settings = { value, expires: Date.now() + SETTINGS_TTL_MS };
      return value;
    },

    oauthUrl(provider, redirectTo, codeChallenge) {
      const target = new URL(`${url}/auth/v1/authorize`);
      target.searchParams.set('provider', provider);
      target.searchParams.set('redirect_to', redirectTo);
      target.searchParams.set('code_challenge', codeChallenge);
      target.searchParams.set('code_challenge_method', 's256');
      return target.toString();
    },

    async exchangeCode(code, codeVerifier) {
      const response = await fetch(`${url}/auth/v1/token?grant_type=pkce`, {
        method: 'POST',
        headers: { apikey: serviceKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
      });
      if (!response.ok) throw new HttpError(401, 'Sign-in was not completed. Please try again.');
      const body = (await response.json()) as { user?: Pick<User, 'id' | 'email'> };
      return toUser(body.user);
    },
  };
}
