import { getDatabase } from '@xfield/db';
import { getIdentity } from '../infrastructure/identity/index.ts';
import { getStorage } from '../infrastructure/storage/index.ts';
import { toErrorResponse } from '../middlewares/error.ts';
import { assertTrustedOrigin } from '../middlewares/origin.ts';
import { resolveSession } from '../middlewares/session.ts';
import { routes } from '../routes/index.ts';
import { json } from '../shared/http.ts';
import { createRouter } from '../shared/router.ts';

export interface Runtime {
  /** Keeps the host alive until the task settles, after the response is sent. */
  defer: (task: () => Promise<unknown>) => void;
}

const matchRoute = createRouter(routes);

async function respond(request: Request, runtime: Runtime): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === '/api/health') return json({ ok: true });
  assertTrustedOrigin(request);
  const { controller, params } = matchRoute(request.method, url.pathname);
  const dependencies = { db: await getDatabase(), storage: getStorage(), identity: getIdentity() };
  const session = await resolveSession(request, dependencies);
  const response = await controller({
    ...dependencies,
    request,
    url,
    params,
    workspaceId: session.workspaceId,
    email: session.email,
    sessionToken: session.token,
    needsOnboarding: session.needsOnboarding,
    defer: runtime.defer,
  });
  return session.commit(response);
}

/**
 * The API as a plain `Request -> Response` function. It has no dependency on
 * a web framework, so the host only has to forward requests to it.
 */
export async function handleRequest(request: Request, runtime: Runtime): Promise<Response> {
  // One id ties a response to its log lines; the platform's id is reused when present.
  const requestId = request.headers.get('x-vercel-id') ?? crypto.randomUUID();
  const response = await respond(request, runtime).catch((error: unknown) =>
    toErrorResponse(error, request, requestId),
  );
  // Redirects to signed storage URLs are returned as they are.
  if (response.status >= 300 && response.status < 400) return response;
  const tagged = new Response(response.body, response);
  tagged.headers.set('X-Request-Id', requestId);
  return tagged;
}
