import test from 'node:test';
import assert from 'node:assert/strict';
import { client, imageForm } from './helpers.mjs';

const credentials = () => ({
  email: `user-${crypto.randomUUID()}@example.test`,
  password: 'correct horse battery',
  acceptTerms: true,
});
// These exercise local password accounts; supabase-auth.test.mjs covers Supabase Auth.
const { data: providers } = await client()('/auth/providers');
const local = { skip: providers.verification && 'the server uses Supabase Auth' };

const owns = async (api, assetId) =>
  (await api('/assets')).data.some((asset) => asset.id === assetId);

test('signing up keeps guest work and makes it reachable from another device', local, async () => {
  const laptop = client();
  const upload = await laptop('/upload', 'POST', imageForm());
  assert.equal(upload.status, 201);
  assert.equal((await laptop('/session')).data.email, null);

  const account = credentials();
  assert.equal((await laptop('/auth/signup', 'POST', account)).status, 201);
  assert.equal((await laptop('/session')).data.email, account.email);
  assert.equal(await owns(laptop, upload.data.id), true);

  const phone = client();
  assert.equal((await phone('/auth/signin', 'POST', account)).status, 200);
  assert.equal(await owns(phone, upload.data.id), true);
});

test('signing out ends access, including through the adopted guest cookie', local, async () => {
  const browser = client();
  const upload = await browser('/upload', 'POST', imageForm('city'));
  await browser('/auth/signup', 'POST', credentials());
  assert.equal((await browser('/auth/signout', 'POST', {})).status, 200);
  assert.equal((await browser('/session')).data.email, null);
  assert.equal(await owns(browser, upload.data.id), false);
});

test(
  'credentials are validated and failures do not reveal which part was wrong',
  local,
  async () => {
    const account = credentials();
    const signUp = (body) => client()('/auth/signup', 'POST', body);
    assert.equal((await signUp({ ...account, password: 'short' })).status, 400);
    assert.equal((await signUp({ ...account, email: 'nope' })).status, 400);
    assert.equal((await signUp({ ...account, acceptTerms: false })).status, 400);
    assert.equal((await signUp(account)).status, 201);
    assert.equal((await signUp(account)).status, 409);

    const signIn = (body) => client()('/auth/signin', 'POST', body);
    const wrongPassword = await signIn({ ...account, password: 'incorrect-pass' });
    const unknownEmail = await signIn(credentials());
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.equal(wrongPassword.data.error, unknownEmail.data.error);
  },
);

test('new accounts are onboarded once and guests cannot submit onboarding', local, async () => {
  const guest = client();
  assert.equal((await guest('/session')).data.onboarding, false);
  assert.equal((await guest('/onboarding', 'POST', { answers: {} })).status, 401);

  const browser = client();
  assert.equal((await browser('/auth/signup', 'POST', credentials())).status, 201);
  assert.equal((await browser('/session')).data.onboarding, true);
  const bad = await browser('/onboarding', 'POST', { answers: { 'Bad Key': 'x' } });
  assert.equal(bad.status, 400);
  const answers = { use: 'personal', experience: 'expert', create: ['video', 'image'] };
  assert.equal((await browser('/onboarding', 'POST', { answers })).status, 200);
  assert.equal((await browser('/session')).data.onboarding, false);
});
