import { ZodError } from 'zod';
import { HttpError, errorResponse } from '../shared/http.ts';

/** Maps every failure to a JSON response. Only expected errors expose their message. */
export function toErrorResponse(error: unknown, request: Request, requestId: string): Response {
  if (error instanceof HttpError) return errorResponse(error.status, error.message, error.headers);
  if (error instanceof ZodError)
    return errorResponse(400, error.issues[0]?.message ?? 'Invalid request.');
  if (error instanceof SyntaxError) return errorResponse(400, 'Invalid JSON request.');
  console.error(
    JSON.stringify({
      level: 'error',
      method: request.method,
      path: new URL(request.url).pathname,
      requestId,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }),
  );
  return errorResponse(500, 'Something went wrong. Your input is safe; please try again.');
}
