import { text } from '../lib/http.mjs';
import { folderInput, projectInput } from '../../../../packages/shared/src/contracts.ts';

export async function handleProjects({ request, env, p, owner, reply }) {
  if (p === '/api/folders') {
    if (request.method === 'GET')
      return reply(
        (await env.DB.prepare('SELECT * FROM folders WHERE owner=?').bind(owner).all()).results,
      );
    if (request.method === 'POST') {
      const b = folderInput.parse(await request.json());
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO folders VALUES (?,?,?)')
        .bind(id, owner, text(b.name, 80) || 'Untitled folder')
        .run();
      return reply({ id });
    }
  }
  if (/^\/api\/folders\/[^/]+$/.test(p) && request.method === 'PATCH') {
    const b = folderInput.parse(await request.json());
    await env.DB.prepare('UPDATE folders SET name=? WHERE id=? AND owner=?')
      .bind(text(b.name, 80), p.split('/').pop(), owner)
      .run();
    return reply({ ok: true });
  }
  if (p === '/api/projects') {
    if (request.method === 'GET')
      return reply(
        (
          await env.DB.prepare('SELECT * FROM projects WHERE owner=? ORDER BY created DESC')
            .bind(owner)
            .all()
        ).results.map((p) => ({ ...p, data: JSON.parse(p.data) })),
      );
    if (request.method === 'POST') {
      const b = projectInput.parse(await request.json());
      if (JSON.stringify(b.data || {}).length > 100000)
        return reply({ error: 'Project is too large' }, 400);
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO projects VALUES (?,?,?,?,?)')
        .bind(
          id,
          owner,
          text(b.name, 80) || 'Untitled project',
          JSON.stringify(b.data || {}),
          Date.now(),
        )
        .run();
      return reply({ id });
    }
  }
  if (/^\/api\/projects\/[^/]+$/.test(p)) {
    const id = p.split('/').pop();
    if (request.method === 'PATCH') {
      const b = projectInput.parse(await request.json());
      if (JSON.stringify(b.data || {}).length > 100000)
        return reply({ error: 'Project too large' }, 400);
      await env.DB.prepare('UPDATE projects SET name=?,data=? WHERE id=? AND owner=?')
        .bind(text(b.name, 80), JSON.stringify(b.data || {}), id, owner)
        .run();
      return reply({ ok: true });
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM projects WHERE id=? AND owner=?').bind(id, owner).run();
      return reply({ ok: true });
    }
  }

  return null;
}
