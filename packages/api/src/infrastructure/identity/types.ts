import type { AuthProviders } from '@xfield/shared';

export interface IdentityUser {
  id: string;
  email: string;
}

export type OAuthProvider = 'google';

/** An external identity provider. Our own sessions are issued after it vouches for a user. */
export interface Identity {
  /** Registers an unverified account and emails a verification code and link. */
  signUp(email: string, password: string, redirectTo: string): Promise<void>;
  signIn(email: string, password: string): Promise<IdentityUser>;
  verifySignUp(email: string, code: string): Promise<IdentityUser>;
  resendVerification(email: string, redirectTo: string): Promise<void>;
  sendPasswordReset(email: string, redirectTo: string): Promise<void>;
  /** The user behind an access token delivered by an email link. */
  userFromAccessToken(accessToken: string): Promise<IdentityUser>;
  setPassword(userId: string, password: string): Promise<void>;
  providers(): Promise<AuthProviders>;
  oauthUrl(provider: OAuthProvider, redirectTo: string, codeChallenge: string): string;
  exchangeCode(code: string, codeVerifier: string): Promise<IdentityUser>;
}
