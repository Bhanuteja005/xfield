import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default('Creator'),
  created: integer('created').notNull(),
});
export const assets = sqliteTable(
  'assets',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    url: text('url').notNull(),
    prompt: text('prompt').notNull().default(''),
    model: text('model').notNull().default('Upload'),
    folder: text('folder').notNull().default(''),
    favorite: integer('favorite').notNull().default(0),
    published: integer('published').notNull().default(0),
    created: integer('created').notNull(),
  },
  (t) => [index('idx_assets_owner_created').on(t.owner, t.created)],
);
export const jobs = sqliteTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    token: text('token').notNull(),
    prompt: text('prompt').notNull(),
    model: text('model').notNull(),
    kind: text('kind').notNull(),
    settings: text('settings').notNull(),
    status: text('status').notNull(),
    provider: text('provider'),
    asset: text('asset'),
    error: text('error'),
    created: integer('created').notNull(),
  },
  (t) => [
    index('idx_jobs_owner_created').on(t.owner, t.created),
    uniqueIndex('idx_jobs_owner_token').on(t.owner, t.token),
  ],
);
export const projects = sqliteTable(
  'projects',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    name: text('name').notNull(),
    data: text('data').notNull(),
    created: integer('created').notNull(),
  },
  (t) => [index('idx_projects_owner').on(t.owner)],
);
export const folders = sqliteTable(
  'folders',
  { id: text('id').primaryKey(), owner: text('owner').notNull(), name: text('name').notNull() },
  (t) => [index('idx_folders_owner').on(t.owner)],
);
