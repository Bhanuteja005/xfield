import test from 'node:test';
import assert from 'node:assert/strict';
import { client, imageForm, previewJob, waitForJob } from './helpers.mjs';

test('bulk actions only touch assets the caller owns', async () => {
  const owner = client();
  const other = client();
  const mine = [
    (await owner('/upload', 'POST', imageForm('city'))).data.id,
    (await owner('/upload', 'POST', imageForm('coast'))).data.id,
  ];
  const theirs = (await other('/upload', 'POST', imageForm('car'))).data.id;
  const folder = (await owner('/folders', 'POST', { name: 'Shoot' })).data.id;
  const everything = [...mine, theirs];

  const moved = await owner('/assets/bulk', 'POST', { action: 'move', ids: everything, folder });
  assert.equal(moved.data.changed, 2);
  await owner('/assets/bulk', 'POST', { action: 'favorite', ids: mine, favorite: true });
  const listed = (await owner('/assets')).data;
  assert.equal(listed.filter((asset) => asset.folder === folder && asset.favorite).length, 2);

  // Deleting the folder keeps its assets.
  assert.equal((await owner('/folders/' + folder, 'DELETE')).status, 200);
  assert.equal((await owner('/folders')).data.length, 0);
  assert.equal((await owner('/assets')).data.filter((asset) => asset.folder === '').length, 2);

  const deleted = await owner('/assets/bulk', 'POST', { action: 'delete', ids: everything });
  assert.equal(deleted.data.changed, 2);
  assert.equal((await owner('/assets')).data.length, 0);
  assert.equal((await other('/assets')).data.length, 1);
  assert.equal((await owner('/assets/bulk', 'POST', { action: 'delete', ids: [] })).status, 400);
});

test('lists page by cursor and every response carries a request id', async () => {
  const api = client();
  for (const name of ['city', 'coast', 'car']) await api('/upload', 'POST', imageForm(name));
  const first = await api('/assets?limit=2');
  assert.equal(first.data.length, 2);
  assert.match(first.res.headers.get('x-request-id'), /\S+/);
  const rest = await api(`/assets?limit=2&before=${first.data[1].created}`);
  assert.equal(rest.data.length, 1);
  const ids = [...first.data, ...rest.data].map((asset) => asset.id);
  assert.equal(new Set(ids).size, 3);
  assert.equal((await api('/assets?limit=0')).status, 400);
});

test('deleting an asset detaches it from the job that produced it', async () => {
  const api = client();
  const { data } = await api('/jobs', 'POST', previewJob());
  const finished = await waitForJob(api, data.id);
  assert.equal(finished.status, 'completed');
  await api('/assets/' + finished.asset, 'DELETE');
  const after = (await api('/jobs')).data.find((job) => job.id === data.id);
  assert.equal(after.status, 'completed');
  assert.equal(after.asset, null);
});

test('the generation rate limit holds under parallel submissions', async () => {
  const api = client();
  await api('/session');
  const results = await Promise.all(
    Array.from({ length: 10 }, () => api('/jobs', 'POST', previewJob())),
  );
  assert.equal(results.filter((result) => result.status === 201).length, 6);
  assert.equal(results.filter((result) => result.status === 429).length, 4);
});
