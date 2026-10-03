// Applies pending migrations to the database named by DATABASE_URL.
import path from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Set DATABASE_URL to the Postgres connection string.');

const client = postgres(url, { prepare: false, max: 1 });
await migrate(drizzle(client), {
  migrationsFolder: path.join(import.meta.dirname, '..', 'migrations'),
});
await client.end();
console.log('Migrations applied.');
