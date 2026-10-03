import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema.ts';

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

/** Hosted Postgres. `prepare: false` is required behind a transaction-mode pooler. */
async function connectPostgres(url: string): Promise<Database> {
  const { default: postgres } = await import('postgres');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  return drizzle(postgres(url, { prepare: false, max: 5 }), { schema });
}

/**
 * Embedded Postgres for development, tests and CI. It runs in-process and keeps
 * its files in `.data/`, so the project works with no database to provision.
 */
async function connectEmbedded(directory: string): Promise<Database> {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(directory, { recursive: true });
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const database = drizzle(new PGlite(directory), { schema });
  await migrate(database, { migrationsFolder: process.env.XFIELD_MIGRATIONS ?? MIGRATIONS });
  return database;
}

// Cached on globalThis so development hot reloads reuse one connection.
const cache = globalThis as typeof globalThis & { __xfieldDb?: Promise<Database> };

export function getDatabase(): Promise<Database> {
  cache.__xfieldDb ??= process.env.DATABASE_URL
    ? connectPostgres(process.env.DATABASE_URL)
    : connectEmbedded(path.resolve(process.env.XFIELD_DATA_DIR ?? '.data', 'postgres'));
  return cache.__xfieldDb;
}
