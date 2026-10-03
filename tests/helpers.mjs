import fs from 'node:fs';

export const base = process.env.TEST_API_ORIGIN || 'http://127.0.0.1:3000';

/** A browser-like API client with its own cookie jar. */
export function client() {
  const jar = new Map();
  return async (path, method = 'GET', body) => {
    const isForm = body instanceof FormData;
    const res = await fetch(base + '/api' + path, {
      method,
      redirect: 'manual',
      headers: {
        Origin: base,
        Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join('; '),
        ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: isForm ? body : JSON.stringify(body) } : {}),
    });
    for (const cookie of res.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const [name, value] = pair.split('=');
      if (/Max-Age=0\b/.test(cookie)) jar.delete(name);
      else jar.set(name, value);
    }
    const text = await res.text();
    return { status: res.status, data: text ? JSON.parse(text) : null, res };
  };
}

export function imageForm(name = 'portrait') {
  const form = new FormData();
  form.append(
    'file',
    new File([fs.readFileSync(`apps/web/public/media/${name}.jpg`)], `${name}.jpg`, {
      type: 'image/jpeg',
    }),
  );
  return form;
}

export const previewJob = (overrides = {}) => ({
  token: crypto.randomUUID(),
  prompt: 'Test composition',
  kind: 'image',
  model: 'Soul 2',
  ratio: '1:1',
  duration: 5,
  resolution: '720p',
  mode: 'preview',
  ...overrides,
});

/** Polls the job list until the job leaves the processing state. */
export async function waitForJob(api, id) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const job = (await api('/jobs')).data.find((entry) => entry.id === id);
    if (job && job.status !== 'processing') return job;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Job ${id} did not finish in time`);
}
