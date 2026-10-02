import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.TEST_API_ORIGIN || 'http://127.0.0.1:8787';
function client() {
  let cookie = '';
  return async (path, method = 'GET', body) => {
    const res = await fetch(base + '/api' + path, {
      method,
      headers: {
        Origin: base,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
    });
    const set = res.headers.get('set-cookie');
    if (set?.startsWith('xf_workspace=')) cookie = set.split(';')[0];
    return { status: res.status, data: await res.json(), res };
  };
}
test('workspace isolation, persistent uploads, folders, projects and publishing', async () => {
  const owner = client(),
    other = client();
  assert.equal((await owner('/session')).status, 200);
  await other('/session');
  const form = new FormData();
  form.append(
    'file',
    new File([fs.readFileSync('public/media/portrait.jpg')], 'reference.jpg', {
      type: 'image/jpeg',
    }),
  );
  const upload = await owner('/upload', 'POST', form);
  assert.equal(upload.status, 200);
  const id = upload.data.id;
  assert.equal(
    (await owner('/assets')).data.some((a) => a.id === id),
    true,
  );
  assert.equal(
    (await other('/assets')).data.some((a) => a.id === id),
    false,
  );
  assert.equal((await other('/assets/' + id, 'PATCH', { name: 'stolen' })).status, 404);
  assert.equal((await fetch(base + '/api/media/' + id)).status, 404);
  const folder = await owner('/folders', 'POST', { name: 'Campaign' });
  assert.equal(folder.status, 200);
  await owner('/assets/' + id, 'PATCH', {
    favorite: true,
    folder: folder.data.id,
    name: 'Renamed reference',
  });
  const asset = (await owner('/assets')).data.find((a) => a.id === id);
  assert.equal(asset.favorite, 1);
  assert.equal(asset.name, 'Renamed reference');
  await owner('/folders/' + folder.data.id, 'PATCH', { name: 'New campaign' });
  assert.equal(
    (await owner('/folders')).data.find((f) => f.id === folder.data.id).name,
    'New campaign',
  );
  const project = await owner('/projects', 'POST', {
    name: 'Test canvas',
    data: { nodes: [{ id: 'a', type: 'note', text: 'An idea', x: 20, y: 30 }] },
  });
  assert.equal(project.status, 200);
  assert.equal(
    (await other('/projects')).data.some((p) => p.id === project.data.id),
    false,
  );
  await owner('/projects/' + project.data.id, 'PATCH', {
    name: 'Saved canvas',
    data: { nodes: [] },
  });
  assert.equal(
    (await owner('/projects')).data.find((p) => p.id === project.data.id).name,
    'Saved canvas',
  );
  await owner('/assets/' + id, 'PATCH', { published: true });
  assert.equal((await fetch(base + '/api/public/' + id)).status, 200);
  assert.equal(
    (await other('/community')).data.some((a) => a.id === id),
    true,
  );
  await owner('/assets/' + id, 'PATCH', { published: false });
  assert.equal((await fetch(base + '/api/public/' + id)).status, 404);
  await owner('/assets/' + id, 'DELETE');
  assert.equal(
    (await owner('/assets')).data.some((a) => a.id === id),
    false,
  );
  await owner('/projects/' + project.data.id, 'DELETE');
});
test('generation is validated, idempotent and creates a stored result', async () => {
  const c = client();
  await c('/session');
  const body = {
    token: crypto.randomUUID(),
    prompt: 'Test composition',
    kind: 'image',
    model: 'Soul 2',
    ratio: '1:1',
    duration: 5,
    resolution: '720p',
    mode: 'preview',
  };
  assert.equal((await c('/jobs', 'POST', { ...body, prompt: '' })).status, 400);
  const first = await c('/jobs', 'POST', body);
  assert.equal(first.status, 200);
  const again = await c('/jobs', 'POST', body);
  assert.equal(again.data.id, first.data.id);
  let job;
  for (let i = 0; i < 20; i++) {
    job = (await c('/jobs')).data.find((j) => j.id === first.data.id);
    if (job.status === 'completed') break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal(job.status, 'completed');
  assert.ok(job.asset);
  assert.equal((await c('/assets')).data.filter((a) => a.id === job.asset).length, 1);
  assert.equal(
    (await c('/jobs', 'POST', { ...body, token: crypto.randomUUID(), mode: 'live' })).status,
    401,
  );
});
test('mutations reject cross-origin requests and dangerous uploads', async () => {
  const res = await fetch(base + '/api/profile', {
    method: 'PATCH',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'bad' }),
  });
  assert.equal(res.status, 403);
  const c = client();
  await c('/session');
  const form = new FormData();
  form.append('file', new File(['<script>bad</script>'], 'unsafe.html', { type: 'text/html' }));
  assert.equal((await c('/upload', 'POST', form)).status, 400);
});
