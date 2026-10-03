import { createSupabaseIdentity } from './supabase.ts';
import type { Identity } from './types.ts';

export type { Identity, IdentityUser, OAuthProvider } from './types.ts';

let identity: Identity | null | undefined;

/** Supabase Auth when configured, otherwise null and accounts use local password hashes. */
export function getIdentity(): Identity | null {
  if (identity !== undefined) return identity;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  identity =
    SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? createSupabaseIdentity(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;
  return identity;
}
