import { assetUpdate, bulkAssetInput, pageQuery } from '@xfield/shared';
import { MAX_UPLOAD_BYTES } from '../config.ts';
import type { MediaStorage } from '../infrastructure/storage/types.ts';
import * as assetService from '../services/asset.service.ts';
import type { Controller } from '../shared/context.ts';
import { HttpError, json } from '../shared/http.ts';
import { param } from '../shared/router.ts';

async function serveMedia(storage: MediaStorage, key: string, cacheControl: string) {
  const media = await storage.read(key);
  if (!media) throw new HttpError(404, 'Media unavailable');
  if ('redirect' in media)
    return new Response(null, {
      status: 302,
      headers: { Location: media.redirect, 'Cache-Control': 'no-store' },
    });
  return new Response(media.body, {
    headers: {
      'Content-Type': media.contentType,
      'X-Content-Type-Options': 'nosniff',
      // Stored media includes SVG; this stops it running script if opened directly.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      'Cache-Control': cacheControl,
    },
  });
}

export const listAssets: Controller = async (context) =>
  json(
    await assetService.listAssets(
      context,
      context.workspaceId,
      pageQuery.parse(Object.fromEntries(context.url.searchParams)),
    ),
  );

export const bulkUpdateAssets: Controller = async (context) => {
  const input = bulkAssetInput.parse(await context.request.json());
  const changed = await assetService.bulkUpdateAssets(context, context.workspaceId, input);
  return json({ changed });
};

export const listCommunity: Controller = async (context) =>
  json(await assetService.listCommunity(context));

export const getPrivateMedia: Controller = async (context) => {
  const key = await assetService.privateMediaKey(
    context,
    context.workspaceId,
    param(context.params, 'id'),
  );
  return serveMedia(context.storage, key, 'private, max-age=300');
};

// Short cache lifetime so that revoking publication takes effect quickly.
export const getPublicMedia: Controller = async (context) => {
  const key = await assetService.publicMediaKey(context, param(context.params, 'id'));
  return serveMedia(context.storage, key, 'public, max-age=60');
};

export const upload: Controller = async (context) => {
  if (Number(context.request.headers.get('Content-Length')) > MAX_UPLOAD_BYTES + 4096)
    throw new HttpError(413, 'Maximum upload size is 4 MB.');
  const file = (await context.request.formData()).get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'Attach a file to upload.');
  return json(await assetService.uploadAsset(context, context.workspaceId, file), 201);
};

export const updateAsset: Controller = async (context) => {
  const changes = assetUpdate.parse(await context.request.json());
  await assetService.updateAsset(
    context,
    context.workspaceId,
    param(context.params, 'id'),
    changes,
  );
  return json({ ok: true });
};

export const deleteAsset: Controller = async (context) => {
  await assetService.deleteAsset(context, context.workspaceId, param(context.params, 'id'));
  return json({ ok: true });
};
