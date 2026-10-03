import { schema } from '@xfield/db';
import type { ProjectInput } from '@xfield/shared';
import { and, asc, desc, eq } from 'drizzle-orm';
import { MAX_PROJECT_BYTES } from '../config.ts';
import type { Dependencies } from '../shared/context.ts';
import { HttpError } from '../shared/http.ts';

const { assets, folders, projects } = schema;

function assertFits(input: ProjectInput) {
  if (JSON.stringify(input.data).length > MAX_PROJECT_BYTES)
    throw new HttpError(413, 'Project is too large');
}

export const listFolders = ({ db }: Dependencies, workspaceId: string) =>
  db
    .select({ id: folders.id, name: folders.name })
    .from(folders)
    .where(eq(folders.owner, workspaceId))
    .orderBy(asc(folders.name));

export async function createFolder({ db }: Dependencies, workspaceId: string, name: string) {
  const id = crypto.randomUUID();
  await db.insert(folders).values({ id, owner: workspaceId, name });
  return { id };
}

export async function renameFolder(
  { db }: Dependencies,
  workspaceId: string,
  folderId: string,
  name: string,
) {
  const updated = await db
    .update(folders)
    .set({ name })
    .where(and(eq(folders.id, folderId), eq(folders.owner, workspaceId)))
    .returning({ id: folders.id });
  if (!updated.length) throw new HttpError(404, 'Folder not found');
}

/** Removes a folder. Its assets are kept and returned to the top level. */
export async function deleteFolder({ db }: Dependencies, workspaceId: string, folderId: string) {
  const deleted = await db.transaction(async (tx) => {
    const rows = await tx
      .delete(folders)
      .where(and(eq(folders.id, folderId), eq(folders.owner, workspaceId)))
      .returning({ id: folders.id });
    if (rows.length)
      await tx
        .update(assets)
        .set({ folder: '' })
        .where(and(eq(assets.owner, workspaceId), eq(assets.folder, folderId)));
    return rows.length;
  });
  if (!deleted) throw new HttpError(404, 'Folder not found');
}

export const listProjects = ({ db }: Dependencies, workspaceId: string) =>
  db
    .select({
      id: projects.id,
      name: projects.name,
      data: projects.data,
      created: projects.created,
    })
    .from(projects)
    .where(eq(projects.owner, workspaceId))
    .orderBy(desc(projects.created));

export async function createProject(
  { db }: Dependencies,
  workspaceId: string,
  input: ProjectInput,
) {
  assertFits(input);
  const id = crypto.randomUUID();
  await db
    .insert(projects)
    .values({ id, owner: workspaceId, name: input.name, data: input.data, created: Date.now() });
  return { id };
}

export async function updateProject(
  { db }: Dependencies,
  workspaceId: string,
  projectId: string,
  input: ProjectInput,
) {
  assertFits(input);
  const updated = await db
    .update(projects)
    .set({ name: input.name, data: input.data })
    .where(and(eq(projects.id, projectId), eq(projects.owner, workspaceId)))
    .returning({ id: projects.id });
  if (!updated.length) throw new HttpError(404, 'Project not found');
}

export async function deleteProject({ db }: Dependencies, workspaceId: string, projectId: string) {
  const deleted = await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.owner, workspaceId)))
    .returning({ id: projects.id });
  if (!deleted.length) throw new HttpError(404, 'Project not found');
}
