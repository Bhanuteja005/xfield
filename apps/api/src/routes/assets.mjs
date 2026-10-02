import { text } from '../lib/http.mjs';
import { assetUpdate } from '../../../../packages/shared/src/contracts.ts';

export async function handleAssets({ request, env, p, owner, reply }) {
  const publicMedia = p.startsWith('/api/public/');
  if (p === '/api/assets' && request.method === 'GET')
    return reply(
      (
        await env.DB.prepare('SELECT * FROM assets WHERE owner=? ORDER BY created DESC LIMIT 500')
          .bind(owner)
          .all()
      ).results,
    );
  if (p === '/api/community')
    return reply(
      (
        await env.DB.prepare(
          'SELECT id,name,kind,prompt,model,created FROM assets WHERE published=1 ORDER BY created DESC LIMIT 100',
        ).all()
      ).results.map((a) => ({ ...a, url: `/api/public/${a.id}` })),
    );
  if ((p.startsWith('/api/media/') || publicMedia) && request.method === 'GET') {
    const id = p.split('/').pop();
    const a = publicMedia
      ? await env.DB.prepare('SELECT * FROM assets WHERE id=? AND published=1').bind(id).first()
      : await env.DB.prepare('SELECT * FROM assets WHERE id=? AND owner=?').bind(id, owner).first();
    if (!a) return reply({ error: 'Asset not found' }, 404);
    const object = await env.MEDIA.get(
      `${a.owner}/${id}${a.model === 'Concept preview' ? '.svg' : ''}`,
    );
    if (!object) return reply({ error: 'Media unavailable' }, 404);
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        'Cache-Control': 'private, max-age=300',
      },
    });
  }
  if (p === '/api/upload' && request.method === 'POST') {
    const length = Number(request.headers.get('content-length'));
    if (length > 20 * 1024 * 1024) return reply({ error: 'Maximum upload size is 20 MB.' }, 413);
    const form = await request.formData(),
      file = form.get('file');
    if (
      !file?.size ||
      file.size > 20 * 1024 * 1024 ||
      ![
        'image/png',
        'image/jpeg',
        'image/webp',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/wav',
        'audio/webm',
      ].includes(file.type)
    )
      return reply({ error: 'Upload a PNG, JPG, WebP, MP4, WebM, MP3 or WAV under 20 MB.' }, 400);
    const id = crypto.randomUUID(),
      kind = file.type.split('/')[0];
    await env.MEDIA.put(`${owner}/${id}`, file.stream(), {
      httpMetadata: { contentType: file.type },
    });
    await env.DB.prepare('INSERT INTO assets (id,owner,name,kind,url,created) VALUES (?,?,?,?,?,?)')
      .bind(id, owner, file.name.slice(0, 120), kind, `/api/media/${id}`, Date.now())
      .run();
    return reply({ id, url: `/api/media/${id}`, name: file.name, kind });
  }
  if (/^\/api\/assets\/[^/]+$/.test(p)) {
    const id = p.split('/').pop();
    const a = await env.DB.prepare('SELECT * FROM assets WHERE id=? AND owner=?')
      .bind(id, owner)
      .first();
    if (!a) return reply({ error: 'Asset not found' }, 404);
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM assets WHERE id=? AND owner=?').bind(id, owner).run();
      await env.MEDIA.delete(`${owner}/${id}${a.model === 'Concept preview' ? '.svg' : ''}`);
      return reply({ ok: true });
    }
    if (request.method === 'PATCH') {
      const b = assetUpdate.parse(await request.json());
      if (
        b.folder &&
        !(await env.DB.prepare('SELECT id FROM folders WHERE id=? AND owner=?')
          .bind(b.folder, owner)
          .first())
      )
        return reply({ error: 'Folder not found' }, 404);
      await env.DB.prepare(
        'UPDATE assets SET name=?,folder=?,favorite=?,published=? WHERE id=? AND owner=?',
      )
        .bind(
          text(b.name ?? a.name, 120),
          text(b.folder ?? a.folder, 80),
          b.favorite === undefined ? a.favorite : Number(!!b.favorite),
          b.published === undefined ? a.published : Number(!!b.published),
          id,
          owner,
        )
        .run();
      return reply({ ok: true });
    }
  }

  return null;
}
