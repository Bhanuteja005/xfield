import { schema } from '@xfield/db';
import { eq } from 'drizzle-orm';
import { DEFAULT_WORKSPACE_NAME } from '../config.ts';
import type { Dependencies } from '../shared/context.ts';

const { workspaces } = schema;

export async function getWorkspaceName({ db }: Dependencies, workspaceId: string) {
  const [row] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  return row?.name ?? DEFAULT_WORKSPACE_NAME;
}

/**
 * The workspace row is created on first write, so an anonymous visitor who
 * only browses never costs a database write.
 */
export async function renameWorkspace({ db }: Dependencies, workspaceId: string, name: string) {
  await db
    .insert(workspaces)
    .values({ id: workspaceId, name, created: Date.now() })
    .onConflictDoUpdate({ target: workspaces.id, set: { name } });
}
