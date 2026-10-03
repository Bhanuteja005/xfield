import { schema } from '@xfield/db';
import type { AssetUpdate, BulkAssetInput, PageQuery } from '@xfield/shared';
import { and, desc, eq, getTableColumns, inArray, lt } from 'drizzle-orm';
import { ASSET_PAGE_SIZE, COMMUNITY_PAGE_SIZE, MAX_UPLOAD_BYTES } from '../config.ts';
import type { Dependencies } from '../shared/context.ts';
import { HttpError } from '../shared/http.ts';
import { SIGNATURE_BYTES, isUploadType, matchesSignature, mediaKey } from './media.service.ts';

const { assets, folders, jobs } = schema;

// `owner` is the session credential and is deliberately never selected for output.
const { owner: _owner, ...publicColumns } = getTableColumns(assets);
const UPLOAD_HINT = 'Upload a PNG, JPG, WebP, MP4, WebM, MP3 or WAV under 4 MB.';

const ownedBy = (workspaceId: string, assetId: string) =>
  and(eq(assets.id, assetId), eq(assets.owner, workspaceId));

/** Newest first. Pass the `created` of the last row as `before` to read the next page. */
export const listAssets = ({ db }: Dependencies, workspaceId: string, page: PageQuery) =>
  db
    .select(publicColumns)
    .from(assets)
    .where(
      and(eq(assets.owner, workspaceId), page.before ? lt(assets.created, page.before) : undefined),
    )
    .orderBy(desc(assets.created))
    .limit(Math.min(page.limit ?? ASSET_PAGE_SIZE, ASSET_PAGE_SIZE));

async function assertFolder({ db }: Dependencies, workspaceId: string, folderId: string) {
  const [folder] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.owner, workspaceId)));
  if (!folder) throw new HttpError(404, 'Folder not found');
}

/**
 * Deletes rows first, then their files. A job that produced a deleted asset
 * keeps its history entry but no longer points at a missing file.
 */
async function removeAssets({ db, storage }: Dependencies, workspaceId: string, ids: string[]) {
  const deleted = await db.transaction(async (tx) => {
    const rows = await tx
      .delete(assets)
      .where(and(eq(assets.owner, workspaceId), inArray(assets.id, ids)))
      .returning({ id: assets.id });
    const removed = rows.map((row) => row.id);
    if (removed.length)
      await tx
        .update(jobs)
        .set({ asset: null })
        .where(and(eq(jobs.owner, workspaceId), inArray(jobs.asset, removed)));
    return removed;
  });
  await Promise.all(deleted.map((id) => storage.remove(mediaKey(workspaceId, id))));
  return deleted.length;
}

export async function listCommunity({ db }: Dependencies) {
  const rows = await db
    .select({
      id: assets.id,
      name: assets.name,
      kind: assets.kind,
      prompt: assets.prompt,
      model: assets.model,
      created: assets.created,
    })
    .from(assets)
    .where(eq(assets.published, true))
    .orderBy(desc(assets.created))
    .limit(COMMUNITY_PAGE_SIZE);
  return rows.map((asset) => ({ ...asset, url: `/api/public/${asset.id}` }));
}

/** Resolves the storage key for media the caller owns. */
export async function privateMediaKey({ db }: Dependencies, workspaceId: string, assetId: string) {
  const [asset] = await db
    .select({ id: assets.id })
    .from(assets)
    .where(ownedBy(workspaceId, assetId));
  if (!asset) throw new HttpError(404, 'Asset not found');
  return mediaKey(workspaceId, asset.id);
}

/** Resolves the storage key for media its owner has published. */
export async function publicMediaKey({ db }: Dependencies, assetId: string) {
  const [asset] = await db
    .select({ id: assets.id, owner: assets.owner })
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.published, true)));
  if (!asset) throw new HttpError(404, 'Asset not found');
  return mediaKey(asset.owner, asset.id);
}

export async function uploadAsset({ db, storage }: Dependencies, workspaceId: string, file: File) {
  if (!file.size || file.size > MAX_UPLOAD_BYTES) throw new HttpError(400, UPLOAD_HINT);
  const type = file.type;
  if (!isUploadType(type)) throw new HttpError(400, UPLOAD_HINT);
  const head = new Uint8Array(await file.slice(0, SIGNATURE_BYTES).arrayBuffer());
  if (!matchesSignature(type, head))
    throw new HttpError(400, 'The file content does not match its type.');

  const id = crypto.randomUUID();
  const kind = type.split('/')[0] as 'image' | 'video' | 'audio';
  const name = file.name.slice(0, 120) || 'Untitled';
  const url = `/api/media/${id}`;
  const key = mediaKey(workspaceId, id);
  await storage.put(key, file, type);
  try {
    await db
      .insert(assets)
      .values({ id, owner: workspaceId, name, kind, url, created: Date.now() });
  } catch (error) {
    await storage.remove(key);
    throw error;
  }
  return { id, url, name, kind };
}

export async function updateAsset(
  deps: Dependencies,
  workspaceId: string,
  assetId: string,
  changes: AssetUpdate,
) {
  const { db } = deps;
  if (changes.folder) await assertFolder(deps, workspaceId, changes.folder);
  // Only the fields the caller sent are written.
  const defined = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  );
  const updated = Object.keys(defined).length
    ? await db
        .update(assets)
        .set(defined)
        .where(ownedBy(workspaceId, assetId))
        .returning({ id: assets.id })
    : await db.select({ id: assets.id }).from(assets).where(ownedBy(workspaceId, assetId));
  if (!updated.length) throw new HttpError(404, 'Asset not found');
}

export async function deleteAsset(deps: Dependencies, workspaceId: string, id: string) {
  if (!(await removeAssets(deps, workspaceId, [id]))) throw new HttpError(404, 'Asset not found');
}

/** Applies one action to many assets. Ids the caller does not own are ignored. */
export async function bulkUpdateAssets(
  deps: Dependencies,
  workspaceId: string,
  input: BulkAssetInput,
): Promise<number> {
  if (input.action === 'delete') return removeAssets(deps, workspaceId, input.ids);
  if (input.action === 'move' && input.folder) await assertFolder(deps, workspaceId, input.folder);
  const updated = await deps.db
    .update(assets)
    .set(input.action === 'move' ? { folder: input.folder } : { favorite: input.favorite })
    .where(and(eq(assets.owner, workspaceId), inArray(assets.id, input.ids)))
    .returning({ id: assets.id });
  return updated.length;
}
