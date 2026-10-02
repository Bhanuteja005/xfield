export const json = (data, status = 200, headers = {}) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
export const cookie = (r, k) =>
  r.headers
    .get('cookie')
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith(k + '='))
    ?.slice(k.length + 1);
export const text = (v, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : '');
