import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  WORKSPACE_COOKIE,
  WORKSPACE_COOKIE_MAX_AGE_SECONDS,
} from '../config.ts';
import { findSession, isClaimed } from '../services/auth.service.ts';
import type { Dependencies } from '../shared/context.ts';
import { isSecure, readCookie, serializeCookie, withCookie } from '../shared/http.ts';

const WORKSPACE_ID = /^w_[a-f0-9-]{36}$/;

export interface Session {
  workspaceId: string;
  /** The signed-in account, or null for a guest. */
  email: string | null;
  /** True for a signed-in account that has not finished onboarding. */
  needsOnboarding: boolean;
  /** The raw session token when signed in, used to sign out. */
  token: string | null;
  /** Adds the guest cookie to the response when a workspace was just minted. */
  commit: (response: Response) => Response;
}

export const sessionCookie = (request: Request, token: string, maxAgeSeconds?: number) =>
  serializeCookie(SESSION_COOKIE, token, {
    sameSite: 'Lax',
    secure: isSecure(request),
    maxAgeSeconds: maxAgeSeconds ?? SESSION_TTL_MS / 1000,
  });

/**
 * Resolves who is calling. A valid account session wins. Otherwise the caller
 * is a guest: an unguessable workspace id in an HTTP-only cookie is the only
 * credential, giving continuity in one browser.
 */
export async function resolveSession(request: Request, deps: Dependencies): Promise<Session> {
  const token = readCookie(request, SESSION_COOKIE);
  if (token) {
    const account = await findSession(deps, token);
    if (account) return { ...account, token, commit: (response) => response };
  }

  // A guest id adopted by an account stops working as a guest credential, so
  // signing out really ends access to that workspace.
  const guest = readCookie(request, WORKSPACE_COOKIE);
  if (guest && WORKSPACE_ID.test(guest) && !(await isClaimed(deps, guest)))
    return {
      workspaceId: guest,
      email: null,
      needsOnboarding: false,
      token: null,
      commit: (response) => response,
    };

  const workspaceId = `w_${crypto.randomUUID()}`;
  const cookie = serializeCookie(WORKSPACE_COOKIE, workspaceId, {
    sameSite: 'Lax',
    secure: isSecure(request),
    maxAgeSeconds: WORKSPACE_COOKIE_MAX_AGE_SECONDS,
  });
  return {
    workspaceId,
    email: null,
    needsOnboarding: false,
    token: null,
    commit: (response) => withCookie(response, cookie),
  };
}
