export const WORKSPACE_COOKIE = 'xf_workspace';
export const PROVIDER_KEY_COOKIE = 'hf_key';
export const WORKSPACE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
export const SESSION_COOKIE = 'xf_session';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Holds the PKCE verifier while the browser is away at the OAuth provider. */
export const OAUTH_COOKIE = 'xf_oauth';
export const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

/** Serverless request bodies are capped at 4.5 MB on Vercel; stay safely below it. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_PROJECT_BYTES = 100_000;
/** Largest provider result copied into our storage. */
export const MAX_RESULT_BYTES = 100 * 1024 * 1024;

export const ASSET_PAGE_SIZE = 500;
export const COMMUNITY_PAGE_SIZE = 100;
export const JOB_PAGE_SIZE = 100;

export const JOB_RATE_LIMIT = 6;
export const JOB_RATE_WINDOW_MS = 60_000;
/** Upper bound on provider status calls made while serving one job listing. */
export const MAX_PROVIDER_POLLS_PER_REQUEST = 5;

export const PROVIDER_BASE_URL = 'https://api.higgsfield.ai';
export const PROVIDER_TIMEOUT_MS = 20_000;
export const SIGNED_URL_TTL_SECONDS = 300;

export const PREVIEW_MODEL = 'Concept preview';
export const DEFAULT_WORKSPACE_NAME = 'Creator';

/** The only models wired to a live provider endpoint, keyed by output kind. */
export const LIVE_MODELS = {
  image: { name: 'Soul 2', endpoint: '/higgsfield-ai/soul/v2/standard' },
  video: { name: 'Seedance 2.0', endpoint: '/bytedance/seedance-2.0/text-to-video' },
} as const;
