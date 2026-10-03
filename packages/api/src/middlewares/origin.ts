import { HttpError } from '../shared/http.ts';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * CSRF defence for cookie-authenticated writes: the browser-set Origin must
 * name the host the request was sent to.
 */
export function assertTrustedOrigin(request: Request): void {
  if (SAFE_METHODS.includes(request.method)) return;
  const origin = request.headers.get('Origin');
  const host = request.headers.get('X-Forwarded-Host') ?? request.headers.get('Host');
  if (!origin || !URL.canParse(origin) || new URL(origin).host !== host)
    throw new HttpError(403, 'Request origin rejected.');
}
