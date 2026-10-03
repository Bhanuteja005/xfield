import test from 'node:test';
import assert from 'node:assert/strict';
import { generationInput, assetUpdate, profileUpdate } from '../packages/shared/src/index.ts';
import { previewSvg } from '../packages/api/src/services/preview.service.ts';
const valid = {
  token: crypto.randomUUID(),
  prompt: 'A mountain at dawn',
  kind: 'image',
  model: 'Soul 2',
  ratio: '1:1',
  duration: 5,
  resolution: '720p',
  mode: 'preview',
};
test('generation rejects invalid ratios, durations, modes and oversized prompts', () => {
  for (const update of [
    { ratio: '3:7' },
    { duration: 200 },
    { mode: 'fake' },
    { prompt: ' ' },
    { prompt: 'x'.repeat(2001) },
    { token: 'bad' },
    { resolution: '99k' },
  ])
    assert.equal(generationInput.safeParse({ ...valid, ...update }).success, false);
  assert.equal(generationInput.safeParse(valid).success, true);
});
test('asset updates reject non-boolean publication and empty names', () => {
  assert.equal(assetUpdate.safeParse({ published: 'yes' }).success, false);
  assert.equal(assetUpdate.safeParse({ name: '' }).success, false);
  assert.equal(profileUpdate.safeParse({ name: '  Creator  ' }).data.name, 'Creator');
});
test('concept output escapes untrusted prompt markup', () => {
  const svg = previewSvg('<script>alert("oops")</script>', '1:1', 'test');
  assert.ok(!svg.includes('<script>'));
  assert.ok(svg.includes('&lt;script&gt;'));
});
