import { onboardingInput, profileUpdate, providerKeyInput, type Workspace } from '@xfield/shared';
import { PROVIDER_KEY_COOKIE } from '../config.ts';
import { getWorkspaceName, renameWorkspace } from '../services/account.service.ts';
import { saveOnboarding } from '../services/auth.service.ts';
import type { Controller } from '../shared/context.ts';
import { HttpError, isSecure, json, readCookie, serializeCookie } from '../shared/http.ts';

/** The caller's own provider key, held only in an HTTP-only cookie. */
export function providerKey(request: Request): string {
  try {
    return decodeURIComponent(readCookie(request, PROVIDER_KEY_COOKIE) ?? '');
  } catch {
    return '';
  }
}

const keyCookie = (request: Request, value: string, maxAgeSeconds?: number) =>
  serializeCookie(PROVIDER_KEY_COOKIE, value, {
    sameSite: 'Strict',
    secure: isSecure(request),
    maxAgeSeconds,
  });

export const getSession: Controller = async (context) => {
  const session: Workspace = {
    name: await getWorkspaceName(context, context.workspaceId),
    connected: providerKey(context.request) !== '',
    email: context.email,
    onboarding: context.needsOnboarding,
  };
  return json(session);
};

export const completeOnboarding: Controller = async (context) => {
  if (!context.email) throw new HttpError(401, 'Sign in to continue.');
  const { answers } = onboardingInput.parse(await context.request.json());
  await saveOnboarding(context, context.email, answers);
  return json({ ok: true });
};

export const updateProfile: Controller = async (context) => {
  const { name } = profileUpdate.parse(await context.request.json());
  await renameWorkspace(context, context.workspaceId, name);
  return json({ ok: true });
};

export const saveProviderKey: Controller = async ({ request }) => {
  const { key } = providerKeyInput.parse(await request.json());
  return json({ ok: true }, 200, { 'Set-Cookie': keyCookie(request, encodeURIComponent(key)) });
};

export const clearProviderKey: Controller = ({ request }) =>
  json({ ok: true }, 200, { 'Set-Cookie': keyCookie(request, '', 0) });
