/** An error whose message is safe to show to the caller. */
export class HttpError extends Error {
  readonly status: number;
  readonly headers: Record<string, string>;

  constructor(status: number, message: string, headers: Record<string, string> = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.headers = headers;
  }
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
  });

export const errorResponse = (status: number, message: string, headers?: Record<string, string>) =>
  json({ error: message }, status, headers);

export function readCookie(request: Request, name: string): string | undefined {
  const prefix = `${name}=`;
  return request.headers
    .get('Cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

interface CookieOptions {
  sameSite: 'Lax' | 'Strict';
  secure: boolean;
  maxAgeSeconds?: number;
}

export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const attributes = [`${name}=${value}`, 'Path=/', 'HttpOnly', `SameSite=${options.sameSite}`];
  if (options.maxAgeSeconds !== undefined) attributes.push(`Max-Age=${options.maxAgeSeconds}`);
  if (options.secure) attributes.push('Secure');
  return attributes.join('; ');
}

/** Returns a copy of the response with one more Set-Cookie header. */
export function withCookie(response: Response, cookie: string): Response {
  const copy = new Response(response.body, response);
  copy.headers.append('Set-Cookie', cookie);
  return copy;
}

/** True when the request reached the platform over TLS, including behind a proxy. */
export const isSecure = (request: Request) =>
  (request.headers.get('X-Forwarded-Proto') ?? new URL(request.url).protocol).startsWith('https');
