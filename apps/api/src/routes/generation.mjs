import { text } from '../lib/http.mjs';
import { authKey, provider } from '../integrations/higgsfield.mjs';
import { runPreview } from '../services/previews.mjs';
import { generationInput } from '../../../../packages/shared/src/contracts.ts';
export async function handleGeneration({ request, env, ctx, p, owner, reply }) {
  if (p === '/api/jobs' && request.method === 'POST') {
    const b = generationInput.parse(await request.json());
    if (!/^[a-f0-9-]{36}$/.test(b.token || ''))
      return reply({ error: 'Missing submission token' }, 400);
    const existing = await env.DB.prepare('SELECT * FROM jobs WHERE owner=? AND token=?')
      .bind(owner, b.token)
      .first();
    if (existing) return reply(existing);
    const count = await env.DB.prepare('SELECT COUNT(*) n FROM jobs WHERE owner=? AND created>?')
      .bind(owner, Date.now() - 60000)
      .first();
    if (count.n >= 6) return reply({ error: 'Please wait a minute before creating more.' }, 429);
    if (b.mode === 'live' && !authKey(request))
      return reply({ error: 'Connect your Higgsfield API key to generate with AI.' }, 401);
    if (b.mode === 'live' && (b.kind === 'audio' || b.reference))
      return reply(
        {
          error:
            'Live audio and reference generation are not connected yet. Use text-only image or video generation.',
        },
        400,
      );
    if (b.mode === 'live' && b.model !== (b.kind === 'image' ? 'Soul 2' : 'Seedance 2.0'))
      return reply(
        {
          error:
            'Live integration supports Soul 2 and Seedance 2.0. Other models are preview-only.',
        },
        400,
      );
    const job = { id: crypto.randomUUID(), owner, status: 'processing' };
    const inserted = await env.DB.prepare(
      'INSERT OR IGNORE INTO jobs (id,owner,token,prompt,model,kind,settings,status,created) VALUES (?,?,?,?,?,?,?,?,?)',
    )
      .bind(
        job.id,
        owner,
        b.token,
        text(b.prompt),
        text(b.model, 80),
        b.kind,
        JSON.stringify(b),
        'processing',
        Date.now(),
      )
      .run();
    if (!inserted.meta.changes)
      return reply(
        await env.DB.prepare('SELECT * FROM jobs WHERE owner=? AND token=?')
          .bind(owner, b.token)
          .first(),
      );
    if (b.mode === 'preview') {
      ctx.waitUntil(
        runPreview(env, job, b).catch(async () =>
          env.DB.prepare('UPDATE jobs SET status=?,error=? WHERE id=?')
            .bind('failed', 'Preview render failed. Try again.', job.id)
            .run(),
        ),
      );
    } else {
      try {
        const endpoint =
          b.kind === 'video'
            ? 'bytedance/seedance-2.0/text-to-video'
            : 'higgsfield-ai/soul/v2/standard';
        const input =
          b.kind === 'video'
            ? {
                prompt: b.prompt,
                duration: Number(b.duration),
                resolution: b.resolution,
                aspect_ratio: b.ratio,
                generate_audio: !!b.audio,
              }
            : {
                prompt: b.prompt,
                batch_size: 1,
                resolution: b.resolution,
                aspect_ratio: b.ratio,
                enhance_prompt: true,
              };
        const d = await provider(authKey(request), '/' + endpoint, input);
        if (!d.request_id) throw new Error('Provider did not return a request identifier.');
        await env.DB.prepare('UPDATE jobs SET provider=? WHERE id=?')
          .bind(d.request_id, job.id)
          .run();
      } catch (e) {
        await env.DB.prepare('UPDATE jobs SET status=?,error=? WHERE id=?')
          .bind('failed', text(e.message), job.id)
          .run();
      }
    }
    return reply({ id: job.id });
  }
  if (p === '/api/jobs' && request.method === 'GET') {
    const jobs = (
      await env.DB.prepare('SELECT * FROM jobs WHERE owner=? ORDER BY created DESC LIMIT 100')
        .bind(owner)
        .all()
    ).results;
    for (const job of jobs.filter((j) => j.provider && j.status === 'processing')) {
      if (!authKey(request)) continue;
      try {
        const d = await provider(
          authKey(request),
          `/requests/${encodeURIComponent(job.provider)}/status`,
        );
        if (['failed', 'nsfw', 'canceled'].includes(d.status)) {
          job.status = d.status;
          job.error = text(d.error?.message || d.error) || 'Generation did not complete.';
          await env.DB.prepare('UPDATE jobs SET status=?,error=? WHERE id=? AND owner=?')
            .bind(job.status, job.error, job.id, owner)
            .run();
        }
        if (d.status === 'completed') {
          const url = d.video?.url || d.images?.[0]?.url;
          if (!url) throw new Error('Result contains no media.');
          const resultUrl = new URL(url);
          if (resultUrl.protocol !== 'https:') throw new Error('Invalid media URL');
          const media = await fetch(url);
          if (!media.ok) throw new Error('Could not store generated media.');
          const id = job.id;
          await env.MEDIA.put(`${owner}/${id}`, media.body, {
            httpMetadata: {
              contentType: media.headers.get('content-type') || 'application/octet-stream',
            },
          });
          await env.DB.batch([
            env.DB.prepare(
              'INSERT OR IGNORE INTO assets (id,owner,name,kind,url,prompt,model,created) VALUES (?,?,?,?,?,?,?,?)',
            ).bind(
              id,
              owner,
              job.prompt.slice(0, 55),
              job.kind,
              `/api/media/${id}`,
              job.prompt,
              job.model,
              Date.now(),
            ),
            env.DB.prepare(
              'UPDATE jobs SET status=?,asset=? WHERE id=? AND owner=? AND status=?',
            ).bind('completed', id, job.id, owner, 'processing'),
          ]);
          job.status = 'completed';
          job.asset = id;
        }
      } catch (e) {
        job.pollError = text(e.message);
      }
    }
    return reply(jobs);
  }
  if (/^\/api\/jobs\/[^/]+\/cancel$/.test(p) && request.method === 'POST') {
    const id = p.split('/')[3],
      job = await env.DB.prepare('SELECT * FROM jobs WHERE id=? AND owner=?')
        .bind(id, owner)
        .first();
    if (!job) return reply({ error: 'Job not found' }, 404);
    if (job.status !== 'processing') return reply({ error: 'This job has already finished.' }, 409);
    if (job.provider) {
      if (!authKey(request)) return reply({ error: 'Reconnect your provider key to cancel.' }, 401);
      await provider(authKey(request), `/requests/${encodeURIComponent(job.provider)}/cancel`, {});
    }
    await env.DB.prepare('UPDATE jobs SET status=? WHERE id=? AND owner=? AND status=?')
      .bind('canceled', id, owner, 'processing')
      .run();
    return reply({ ok: true });
  }

  return null;
}
