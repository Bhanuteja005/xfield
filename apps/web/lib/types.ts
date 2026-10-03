import type { Asset, Folder, Job, Project, Workspace } from '@xfield/shared';
import type { SectionName } from './sections';

export type { Asset, CanvasNode, Folder, Job, Project, Workspace } from '@xfield/shared';

/** A curated inspiration sample shipped with the app. */
export interface MediaSample {
  id: string;
  name: string;
  image: string;
  category: string;
  creator: string;
  prompt: string;
}

/** Someone else's published asset, as returned by `GET /community`: the public fields only. */
export type CommunityItem = Pick<
  Asset,
  'id' | 'name' | 'kind' | 'prompt' | 'model' | 'created' | 'url'
>;

/** What the detail dialog can show. Only an `Asset` belongs to the viewer and can be changed. */
export type Detail = MediaSample | Asset | CommunityItem;

export const isSample = (detail: Detail): detail is MediaSample => 'creator' in detail;
export const isOwned = (detail: Detail): detail is Asset => 'favorite' in detail;

/** Values one page hands to the next when navigating. */
export interface Seed {
  prompt?: string;
  preset?: string;
  reference?: string;
  project?: Project;
}

export type DialogName = 'key' | 'signin' | 'signup';
export type RouteTarget = SectionName | 'home';

/** Workspace data and actions shared by every studio page. */
export interface StudioApi {
  go: (target: RouteTarget, seed?: Seed | null) => void;
  notify: (message: string) => void;
  refresh: () => Promise<void>;
  /** Runs an action, reloads workspace data and reports the outcome as a toast. */
  mutate: (action: () => Promise<unknown>, message?: string) => Promise<void>;
  assets: Asset[];
  jobs: Job[];
  projects: Project[];
  folders: Folder[];
  session: Workspace;
  seed: Seed | null;
  search: string;
  loading: boolean;
  setDetail: (detail: Detail | null) => void;
  setDialog: (dialog: DialogName | null) => void;
}

/** Reads the message from anything thrown. */
export const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.';
