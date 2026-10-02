import { json, text } from '../lib/http.mjs';
import { authKey } from '../integrations/higgsfield.mjs';
import { profileUpdate } from '../../../../packages/shared/src/contracts.ts';

export async function handleAccount({ request, env, u, p, owner, reply }) {
  if (p === '/api/session')
    return reply({
      name:
        (await env.DB.prepare('SELECT name FROM workspaces WHERE id=?').bind(owner).first())
          ?.name || 'Creator',
      connected: !!authKey(request),
      signedIn: !!request.headers.get('oai-authenticated-user-id'),
      email: request.headers.get('oai-authenticated-user-email') || null,
    });
  if (p === '/api/key') {
    if (request.method === 'DELETE')
      return json({ ok: true }, 200, {
        'Set-Cookie': 'hf_key=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
      });
    if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    const b = await request.json();
    const key = text(b.key, 512).trim();
    if (!key || /[\r\n]/.test(key))
      return reply({ error: 'Paste the complete provider key.' }, 400);
    return json({ ok: true }, 200, {
      'Set-Cookie': `hf_key=${encodeURIComponent(key)}; Path=/; HttpOnly; SameSite=Strict${u.protocol === 'https:' ? '; Secure' : ''}`,
    });
  }
  if (p === '/api/profile' && request.method === 'PATCH') {
    const b = profileUpdate.parse(await request.json());
    await env.DB.prepare('UPDATE workspaces SET name=? WHERE id=?')
      .bind(text(b.name, 60) || 'Creator', owner)
      .run();
    return reply({ ok: true });
  }

  return null;
}
