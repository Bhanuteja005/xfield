import { createClient } from '@supabase/supabase-js';
import { SIGNED_URL_TTL_SECONDS } from '../../config.ts';
import type { MediaStorage } from './types.ts';

/**
 * Supabase Storage with a private bucket. Reads hand out short-lived signed
 * URLs so large media never passes through a serverless response.
 */
export function createSupabaseStorage(
  url: string,
  serviceKey: string,
  bucket: string,
): MediaStorage {
  const files = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from(bucket);
  return {
    async put(key, body, contentType) {
      const { error } = await files.upload(key, body, { contentType, upsert: true });
      if (error) throw new Error(`Storage upload failed: ${error.message}`);
    },
    async read(key) {
      const { data, error } = await files.createSignedUrl(key, SIGNED_URL_TTL_SECONDS);
      return error || !data ? null : { redirect: data.signedUrl };
    },
    async remove(key) {
      const { error } = await files.remove([key]);
      if (error) throw new Error(`Storage delete failed: ${error.message}`);
    },
  };
}
