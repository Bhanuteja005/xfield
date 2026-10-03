import { PROVIDER_BASE_URL, PROVIDER_TIMEOUT_MS } from '../../config.ts';
import { HttpError } from '../../shared/http.ts';

export interface ProviderSubmission {
  request_id?: string;
}

export interface ProviderStatus {
  status?: string;
  error?: string | { message?: string };
  video?: { url?: string };
  images?: { url?: string }[];
}

/** Calls the provider. Sends a POST when a body is given, otherwise a GET. */
export async function callProvider<T>(key: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(PROVIDER_BASE_URL + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    });
  } catch {
    throw new HttpError(502, 'The provider did not respond. Please try again.');
  }
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const detail = [data.detail, data.message].find((value) => typeof value === 'string');
    throw new HttpError(
      response.status === 401 ? 401 : 502,
      detail?.slice(0, 500) || `Provider returned ${response.status}`,
    );
  }
  return data as T;
}
