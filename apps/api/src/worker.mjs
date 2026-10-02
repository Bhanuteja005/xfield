import { json, cookie } from './lib/http.mjs';
import { handleAccount } from './routes/account.mjs';
import { handleAssets } from './routes/assets.mjs';
import { handleProjects } from './routes/projects.mjs';
import { handleGeneration } from './routes/generation.mjs';
import { ZodError } from 'zod';
export default {
  async fetch(request, env, ctx) {
    const u = new URL(request.url),
      p = u.pathname;
    if (!p.startsWith('/api/')) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status === 404 && request.headers.get('Accept')?.includes('text/html')) {
        return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
      }
      return asset;
    }
    try {
      if (request.method !== 'GET' && request.headers.get('Origin') !== u.origin)
        return json({ error: 'Request origin rejected.' }, 403);
      let owner = cookie(request, 'xf_workspace');
      const fresh = !owner || !/^w_[a-f0-9-]{36}$/.test(owner);
      if (fresh) owner = 'w_' + crypto.randomUUID();
      const headers = fresh
        ? {
            'Set-Cookie': `xf_workspace=${owner}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${u.protocol === 'https:' ? '; Secure' : ''}`,
          }
        : {};
      const reply = (d, s = 200) => json(d, s, headers);
      if (!env.DB || !env.MEDIA)
        return reply({ error: 'Storage is unavailable. Please try again shortly.' }, 503);
      await env.DB.prepare('INSERT OR IGNORE INTO workspaces (id,created) VALUES (?,?)')
        .bind(owner, Date.now())
        .run();
      for (const handler of [handleAccount, handleAssets, handleProjects, handleGeneration]) {
        const response = await handler({ request, env, ctx, u, p, owner, reply });
        if (response) return response;
      }
      return reply({ error: 'Not found' }, 404);
    } catch (e) {
      if (e instanceof ZodError)
        return json({ error: e.issues[0]?.message || 'Invalid request.' }, 400);
      if (e instanceof SyntaxError) return json({ error: 'Invalid JSON request.' }, 400);
      console.error('API failure', e.message);
      return json(
        {
          error: e.status
            ? e.message
            : 'Something went wrong. Your input is safe; please try again.',
        },
        e.status || 500,
      );
    }
  },
};
