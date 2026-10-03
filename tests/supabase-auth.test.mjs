// Runs only against a server using Supabase Auth, with SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in this process's environment. Users are created
// through the admin API, so no email is sent, and are deleted afterwards.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { client, imageForm } from './helpers.mjs';

const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
const { data: providers } = await client()('/auth/providers');
const options = {
  skip:
    (!url || !key || !providers.verification) &&
    'needs a Supabase Auth server and SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY',
};

const admin = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const created = [];
const password = 'correct horse battery';
const newEmail = () => `xfield-test-${crypto.randomUUID()}@example.com`;

/** Creates an unverified user and returns its 6-digit code without emailing it. */
async function pendingUser(email) {
  const response = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: admin,
    body: JSON.stringify({ type: 'signup', email, password }),
  });
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  created.push(body.id ?? body.user?.id);
  return body.properties?.email_otp ?? body.email_otp;
}

/** The access token an emailed link would deliver, for the given link type. */
async function linkToken(type, email) {
  const link = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: admin,
    body: JSON.stringify({ type, email }),
  }).then((response) => response.json());
  const verified = await fetch(`${url}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, token_hash: link.properties?.hashed_token ?? link.hashed_token }),
  });
  const body = await verified.json();
  assert.equal(verified.status, 200, JSON.stringify(body));
  return body.access_token;
}

const owns = async (api, assetId) =>
  (await api('/assets')).data.some((asset) => asset.id === assetId);

after(async () => {
  for (const id of created.filter(Boolean))
    await fetch(`${url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: admin });
});

test('providers report email verification and recovery', options, () => {
  assert.equal(providers.verification, true);
  assert.equal(providers.recovery, true);
  assert.equal(typeof providers.google, 'boolean');
});

test('sign-up requires accepting the terms before reaching Supabase', options, async () => {
  const response = await client()('/auth/signup', 'POST', { email: newEmail(), password });
  assert.equal(response.status, 400);
});

test('verifying the emailed code signs in and keeps guest work', options, async () => {
  const email = newEmail();
  const code = await pendingUser(email);
  const browser = client();
  const upload = await browser('/upload', 'POST', imageForm());
  assert.equal(upload.status, 201);

  assert.equal((await browser('/auth/verify', 'POST', { email, code: '000000' })).status, 400);
  const verified = await browser('/auth/verify', 'POST', { email, code });
  assert.equal(verified.status, 200, JSON.stringify(verified.data));
  assert.equal((await browser('/session')).data.email, email);
  assert.equal(await owns(browser, upload.data.id), true);

  const phone = client();
  assert.equal((await phone('/auth/signin', 'POST', { email, password })).status, 200);
  assert.equal(await owns(phone, upload.data.id), true);

  assert.equal((await phone('/auth/signout', 'POST', {})).status, 200);
  assert.equal((await phone('/session')).data.email, null);
  assert.equal(await owns(phone, upload.data.id), false);
});

test('unverified and wrong credentials are refused without leaking which', options, async () => {
  const email = newEmail();
  await pendingUser(email);
  assert.equal((await client()('/auth/signin', 'POST', { email, password })).status, 403);

  const wrong = await client()('/auth/signin', 'POST', { email, password: 'incorrect-pass' });
  const unknown = await client()('/auth/signin', 'POST', { email: newEmail(), password });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.data.error, unknown.data.error);
});

test('a recovery link sets a new password and signs in', options, async () => {
  const email = newEmail();
  const code = await pendingUser(email);
  assert.equal((await client()('/auth/verify', 'POST', { email, code })).status, 200);

  const accessToken = await linkToken('recovery', email);
  const browser = client();
  const reset = await browser('/auth/reset', 'POST', {
    accessToken,
    password: 'a brand new passphrase',
  });
  assert.equal(reset.status, 200, JSON.stringify(reset.data));
  assert.equal((await browser('/session')).data.email, email);

  assert.equal((await client()('/auth/signin', 'POST', { email, password })).status, 401);
  const fresh = await client()('/auth/signin', 'POST', {
    email,
    password: 'a brand new passphrase',
  });
  assert.equal(fresh.status, 200);
});

test('an email link signs in, and a forged token is rejected', options, async () => {
  const email = newEmail();
  const code = await pendingUser(email);
  assert.equal((await client()('/auth/verify', 'POST', { email, code })).status, 200);

  const browser = client();
  const accessToken = await linkToken('magiclink', email);
  assert.equal((await browser('/auth/link', 'POST', { accessToken })).status, 200);
  assert.equal((await browser('/session')).data.email, email);

  const forged = await client()('/auth/link', 'POST', { accessToken: 'x'.repeat(40) });
  assert.equal(forged.status, 401);
});

test('password reset requests do not reveal whether an account exists', options, async () => {
  const response = await client()('/auth/recover', 'POST', { email: newEmail() });
  assert.equal(response.status, 200);
});

test('OAuth start redirects to Supabase with a PKCE challenge', options, async () => {
  const response = await client()('/auth/oauth/google');
  assert.equal(response.status, 302);
  const location = new URL(response.res.headers.get('location'));
  assert.equal(location.origin, new URL(url).origin);
  assert.equal(location.searchParams.get('code_challenge_method'), 's256');
  assert.ok(location.searchParams.get('code_challenge'));
  assert.match(response.res.headers.get('set-cookie') ?? '', /xf_oauth=.+HttpOnly/);
  assert.equal((await client()('/auth/oauth/github')).status, 404);
});
