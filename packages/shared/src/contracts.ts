import { z } from 'zod';
export const generationInput = z.object({
  token: z.uuid(),
  prompt: z.string().trim().min(1, 'Describe what you want to create.').max(2000),
  kind: z.enum(['image', 'video', 'audio']),
  model: z.string().max(80),
  preset: z.string().max(80).default('General'),
  ratio: z.enum(['16:9', '9:16', '1:1', '4:3', '3:4']),
  duration: z.coerce.number().pipe(z.union([z.literal(5), z.literal(8), z.literal(10)])),
  resolution: z.enum(['720p', '1080p']),
  mode: z.enum(['preview', 'live']),
  audio: z.boolean().default(false),
  reference: z.string().max(80).default(''),
  camera: z.string().max(80).optional(),
  lens: z.string().max(20).optional(),
});
export type GenerationInput = z.infer<typeof generationInput>;
export const assetUpdate = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  folder: z.string().max(80).optional(),
  favorite: z.boolean().optional(),
  published: z.boolean().optional(),
});
export const profileUpdate = z.object({ name: z.string().trim().min(1).max(60) });
export const folderInput = z.object({ name: z.string().trim().min(1).max(80) });
export const canvasNode = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(['note', 'image', 'generation']),
  text: z.string().max(2000),
  image: z.string().max(2048).optional(),
  x: z.number().finite().min(-10000).max(10000),
  y: z.number().finite().min(-10000).max(10000),
  color: z
    .string()
    .regex(/^#[a-fA-F0-9]{6}$/)
    .optional(),
});
export const projectInput = z.object({
  name: z.string().trim().min(1).max(80),
  data: z.object({ nodes: z.array(canvasNode).max(100).default([]) }).default({ nodes: [] }),
});
export interface Asset {
  id: string;
  owner: string;
  name: string;
  kind: 'image' | 'video' | 'audio';
  url: string;
  prompt: string;
  model: string;
  folder: string;
  favorite: number;
  published: number;
  created: number;
}
export interface Workspace {
  name: string;
  connected: boolean;
  signedIn: boolean;
  email: string | null;
}
export interface Job {
  id: string;
  owner: string;
  token: string;
  prompt: string;
  model: string;
  kind: 'image' | 'video' | 'audio';
  settings: string;
  status: 'processing' | 'completed' | 'failed' | 'nsfw' | 'canceled';
  provider: string | null;
  asset: string | null;
  error: string | null;
  created: number;
  pollError?: string;
}
export interface CanvasNode {
  id: string;
  type: 'note' | 'image' | 'generation';
  text: string;
  image?: string;
  x: number;
  y: number;
  color?: string;
}
export interface Project {
  id: string;
  owner: string;
  name: string;
  data: { nodes: CanvasNode[] };
  created: number;
}
export interface Folder {
  id: string;
  owner: string;
  name: string;
}
