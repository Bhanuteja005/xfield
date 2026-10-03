import { bigint, boolean, index, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';

// Timestamps are epoch milliseconds so the API and the browser share one representation.
const createdAt = () => bigint('created', { mode: 'number' }).notNull();

export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default('Creator'),
  created: createdAt(),
});

export const assets = pgTable(
  'assets',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    name: text('name').notNull(),
    kind: text('kind', { enum: ['image', 'video', 'audio'] }).notNull(),
    url: text('url').notNull(),
    prompt: text('prompt').notNull().default(''),
    model: text('model').notNull().default('Upload'),
    folder: text('folder').notNull().default(''),
    favorite: boolean('favorite').notNull().default(false),
    published: boolean('published').notNull().default(false),
    created: createdAt(),
  },
  (table) => [
    index('idx_assets_owner_created').on(table.owner, table.created),
    index('idx_assets_published_created').on(table.published, table.created),
  ],
);

export const jobs = pgTable(
  'jobs',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    token: text('token').notNull(),
    prompt: text('prompt').notNull(),
    model: text('model').notNull(),
    kind: text('kind', { enum: ['image', 'video', 'audio'] }).notNull(),
    settings: jsonb('settings').notNull(),
    status: text('status', {
      enum: ['processing', 'completed', 'failed', 'nsfw', 'canceled'],
    }).notNull(),
    provider: text('provider'),
    asset: text('asset'),
    error: text('error'),
    created: createdAt(),
  },
  (table) => [
    index('idx_jobs_owner_created').on(table.owner, table.created),
    uniqueIndex('idx_jobs_owner_token').on(table.owner, table.token),
  ],
);

export const projects = pgTable(
  'projects',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    name: text('name').notNull(),
    data: jsonb('data').notNull(),
    created: createdAt(),
  },
  (table) => [index('idx_projects_owner').on(table.owner, table.created)],
);

export const folders = pgTable(
  'folders',
  {
    id: text('id').primaryKey(),
    owner: text('owner').notNull(),
    name: text('name').notNull(),
  },
  (table) => [index('idx_folders_owner').on(table.owner)],
);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  // The workspace this account owns. A guest workspace is adopted at sign-up.
  workspaceId: text('workspace_id').notNull().unique(),
  created: createdAt(),
});

export const sessions = pgTable(
  'sessions',
  {
    // SHA-256 of the session token, so a database leak does not expose live sessions.
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: bigint('expires', { mode: 'number' }).notNull(),
  },
  (table) => [index('idx_sessions_user').on(table.userId)],
);
