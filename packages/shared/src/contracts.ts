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
export type AssetUpdate = z.infer<typeof assetUpdate>;
export const profileUpdate = z.object({ name: z.string().trim().min(1).max(60) });
export const folderInput = z.object({ name: z.string().trim().min(1).max(80) });
export const providerKeyInput = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'Paste the complete provider key.')
    .max(512)
    .regex(/^[^\r\n;]+$/, 'Paste the complete provider key.'),
});
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address.').max(254));
const password = z.string().min(8, 'Use at least 8 characters.').max(200);
export const credentialsInput = z.object({ email, password });
export type CredentialsInput = z.infer<typeof credentialsInput>;
export const signUpInput = credentialsInput.extend({
  acceptTerms: z.literal(true, {
    error: 'Agree to the Terms and Privacy Policy and confirm you are 18 or older.',
  }),
});
export const emailInput = z.object({ email });
const answer = z.union([z.string().max(80), z.array(z.string().max(80)).max(12)]);
/** Onboarding answers keyed by question id; an empty object records a skip. */
export const onboardingInput = z.object({
  answers: z
    .record(z.string().regex(/^[a-z_]{1,40}$/), answer)
    .refine((answers) => Object.keys(answers).length <= 10, 'Too many answers.'),
});
export const verifyInput = z.object({
  email,
  code: z
    .string()
    .trim()
    // Supabase lets each project choose a code length between 6 and 10 digits.
    .regex(/^\d{6,10}$/, 'Enter the code from the email.'),
});
export const accessTokenInput = z.object({ accessToken: z.string().min(20).max(4096) });
export const passwordResetInput = accessTokenInput.extend({ password });
/** The sign-in methods this deployment offers. */
export interface AuthProviders {
  /** Email sign-up needs a verification code before the first sign-in. */
  verification: boolean;
  recovery: boolean;
  google: boolean;
}
export interface SignUpResult {
  email: string;
  /** True when the account exists but must be verified before signing in. */
  pending: boolean;
}
export const bulkAssetInput = z.discriminatedUnion('action', [
  z.object({ action: z.literal('delete'), ids: z.array(z.uuid()).min(1).max(100) }),
  z.object({
    action: z.literal('move'),
    ids: z.array(z.uuid()).min(1).max(100),
    folder: z.string().max(80),
  }),
  z.object({
    action: z.literal('favorite'),
    ids: z.array(z.uuid()).min(1).max(100),
    favorite: z.boolean(),
  }),
]);
export type BulkAssetInput = z.infer<typeof bulkAssetInput>;
export const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  before: z.coerce.number().int().positive().optional(),
});
export type PageQuery = z.infer<typeof pageQuery>;
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
export type ProjectInput = z.infer<typeof projectInput>;
export interface Asset {
  id: string;
  name: string;
  kind: 'image' | 'video' | 'audio';
  url: string;
  prompt: string;
  model: string;
  folder: string;
  favorite: boolean;
  published: boolean;
  created: number;
}
export interface Workspace {
  name: string;
  connected: boolean;
  /** The signed-in account, or null for a guest workspace. */
  email: string | null;
  /** True for a signed-in account that has not finished onboarding. */
  onboarding: boolean;
}
export type JobStatus = 'processing' | 'completed' | 'failed' | 'nsfw' | 'canceled';
export interface Job {
  id: string;
  prompt: string;
  model: string;
  kind: 'image' | 'video' | 'audio';
  settings: Omit<GenerationInput, 'token'>;
  status: JobStatus;
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
  name: string;
  data: { nodes: CanvasNode[] };
  created: number;
}
export interface Folder {
  id: string;
  name: string;
}
