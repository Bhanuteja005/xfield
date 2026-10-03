import type { Database } from '@xfield/db';
import type { MediaStorage } from '../infrastructure/storage/types.ts';

/** Infrastructure a service may use. Passed in so services stay free of globals. */
export interface Dependencies {
  db: Database;
  storage: MediaStorage;
}

export interface RequestContext extends Dependencies {
  request: Request;
  url: URL;
  params: Record<string, string>;
  /** Opaque workspace identifier taken from the session cookie. Never returned to clients. */
  workspaceId: string;
  /** The signed-in account's email, or null for a guest. */
  email: string | null;
  sessionToken: string | null;
  /** Schedules work that should finish after the response has been sent. */
  defer: (task: () => Promise<unknown>) => void;
}

export type Controller = (context: RequestContext) => Promise<Response> | Response;
