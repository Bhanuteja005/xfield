import { credentialsInput } from '@xfield/shared';
import { sessionCookie } from '../middlewares/session.ts';
import * as authService from '../services/auth.service.ts';
import type { Controller } from '../shared/context.ts';
import { HttpError, json } from '../shared/http.ts';

export const signUp: Controller = async (context) => {
  if (context.email) throw new HttpError(409, 'You are already signed in.');
  const credentials = credentialsInput.parse(await context.request.json());
  const token = await authService.signUp(context, context.workspaceId, credentials);
  return json({ email: credentials.email }, 201, {
    'Set-Cookie': sessionCookie(context.request, token),
  });
};

export const signIn: Controller = async (context) => {
  const credentials = credentialsInput.parse(await context.request.json());
  const token = await authService.signIn(context, credentials);
  return json({ email: credentials.email }, 200, {
    'Set-Cookie': sessionCookie(context.request, token),
  });
};

export const signOut: Controller = async (context) => {
  if (context.sessionToken) await authService.signOut(context, context.sessionToken);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(context.request, '', 0) });
};
