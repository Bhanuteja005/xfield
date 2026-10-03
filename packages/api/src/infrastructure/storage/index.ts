import path from 'node:path';
import { createLocalStorage } from './local.ts';
import { createSupabaseStorage } from './supabase.ts';
import type { MediaStorage } from './types.ts';

export type { MediaStorage, StoredMedia } from './types.ts';

let storage: MediaStorage | undefined;

/** Supabase when configured, otherwise the local filesystem. */
export function getStorage(): MediaStorage {
  if (storage) return storage;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET } = process.env;
  storage =
    SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? createSupabaseStorage(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET ?? 'media')
      : createLocalStorage(path.resolve(process.env.XFIELD_DATA_DIR ?? '.data', 'media'));
  return storage;
}
