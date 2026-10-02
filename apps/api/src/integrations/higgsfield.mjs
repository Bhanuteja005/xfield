import { cookie, text } from '../lib/http.mjs';
export const authKey = (r) => {
  try {
    return decodeURIComponent(cookie(r, 'hf_key') || '');
  } catch {
    return '';
  }
};
export async function provider(key, route, body) {
  const res = await fetch('https://api.higgsfield.ai' + route, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Key ' + key, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw Object.assign(
      new Error(text(data.detail || data.message) || `Provider returned ${res.status}`),
      { status: res.status === 401 ? 401 : 502 },
    );
  return data;
}
