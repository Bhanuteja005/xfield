import { schema } from '@xfield/db';
import type { GenerationInput, PageQuery } from '@xfield/shared';
import { and, count, desc, eq, getTableColumns, gt, lt, sql } from 'drizzle-orm';
import {
  JOB_PAGE_SIZE,
  JOB_RATE_LIMIT,
  JOB_RATE_WINDOW_MS,
  LIVE_MODELS,
  MAX_PROVIDER_POLLS_PER_REQUEST,
  MAX_RESULT_BYTES,
  PREVIEW_MODEL,
  PROVIDER_TIMEOUT_MS,
} from '../config.ts';
import {
  callProvider,
  type ProviderStatus,
  type ProviderSubmission,
} from '../infrastructure/provider/higgsfield.ts';
import type { Dependencies, RequestContext } from '../shared/context.ts';
import { HttpError } from '../shared/http.ts';
import { mediaKey } from './media.service.ts';
import { previewSvg } from './preview.service.ts';

const { assets, jobs } = schema;

// `owner` and the idempotency token are deliberately never selected for output.
const { owner: _owner, token: _token, ...publicColumns } = getTableColumns(jobs);
const PROVIDER_FAILURES = ['failed', 'nsfw', 'canceled'] as const;

type JobRow = Awaited<ReturnType<typeof selectJobs>>[number] & { pollError?: string };
type ProviderFailure = (typeof PROVIDER_FAILURES)[number];

const messageOf = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).slice(0, 500);

const inProgress = (workspaceId: string, jobId: string) =>
  and(eq(jobs.id, jobId), eq(jobs.owner, workspaceId), eq(jobs.status, 'processing'));

const selectJobs = ({ db }: Dependencies, workspaceId: string, page: PageQuery = {}) =>
  db
    .select(publicColumns)
    .from(jobs)
    .where(
      and(eq(jobs.owner, workspaceId), page.before ? lt(jobs.created, page.before) : undefined),
    )
    .orderBy(desc(jobs.created))
    .limit(Math.min(page.limit ?? JOB_PAGE_SIZE, JOB_PAGE_SIZE));

async function findByToken({ db }: Dependencies, workspaceId: string, token: string) {
  const [job] = await db
    .select({ id: jobs.id, status: jobs.status })
    .from(jobs)
    .where(and(eq(jobs.owner, workspaceId), eq(jobs.token, token)));
  return job;
}

const failJob = ({ db }: Dependencies, workspaceId: string, jobId: string, error: string) =>
  db.update(jobs).set({ status: 'failed', error }).where(inProgress(workspaceId, jobId));

/**
 * Completes a job and records its asset in one transaction. Both writes are
 * conditional on the job still being in progress, so a cancelled job never
 * gains an asset and a late result cannot overwrite a cancellation.
 */
async function completeJob(
  { db }: Dependencies,
  workspaceId: string,
  job: { id: string; prompt: string; kind: 'image' | 'video' | 'audio' },
  model: string,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const completed = await tx
      .update(jobs)
      .set({ status: 'completed', asset: job.id })
      .where(inProgress(workspaceId, job.id))
      .returning({ id: jobs.id });
    if (!completed.length) return false;
    await tx
      .insert(assets)
      .values({
        id: job.id,
        owner: workspaceId,
        name: job.prompt.slice(0, 55),
        kind: job.kind === 'audio' ? 'image' : job.kind,
        url: `/api/media/${job.id}`,
        prompt: job.prompt,
        model,
        created: Date.now(),
      })
      .onConflictDoNothing();
    return true;
  });
}

/** Rejects live requests the provider integration cannot serve. Returns the endpoint otherwise. */
function liveEndpoint(input: GenerationInput, providerKey: string): string {
  if (!providerKey)
    throw new HttpError(401, 'Connect your Higgsfield API key to generate with AI.');
  if (input.kind === 'audio' || input.reference)
    throw new HttpError(
      400,
      'Live audio and reference generation are not connected yet. Use text-only image or video generation.',
    );
  const live = LIVE_MODELS[input.kind];
  if (input.model !== live.name)
    throw new HttpError(
      400,
      'Live integration supports Soul 2 and Seedance 2.0. Other models are preview-only.',
    );
  return live.endpoint;
}

const providerPayload = (input: GenerationInput) =>
  input.kind === 'video'
    ? {
        prompt: input.prompt,
        duration: input.duration,
        resolution: input.resolution,
        aspect_ratio: input.ratio,
        generate_audio: input.audio,
      }
    : {
        prompt: input.prompt,
        batch_size: 1,
        resolution: input.resolution,
        aspect_ratio: input.ratio,
        enhance_prompt: true,
      };

async function renderPreview(
  deps: Dependencies,
  workspaceId: string,
  id: string,
  input: GenerationInput,
) {
  const key = mediaKey(workspaceId, id);
  await deps.storage.put(key, previewSvg(input.prompt, input.ratio, id), 'image/svg+xml');
  const completed = await completeJob(deps, workspaceId, { id, ...input }, PREVIEW_MODEL);
  if (!completed) await deps.storage.remove(key);
}

export async function createJob(
  context: Pick<RequestContext, 'db' | 'storage' | 'defer'>,
  workspaceId: string,
  input: GenerationInput,
  providerKey: string,
): Promise<{ job: { id: string; status: string }; created: boolean }> {
  const { db, defer } = context;

  // The client sends one token per submission, so a retried request returns
  // the original job instead of generating (and billing) twice.
  const existing = await findByToken(context, workspaceId, input.token);
  if (existing) return { job: existing, created: false };

  const endpoint = input.mode === 'live' ? liveEndpoint(input, providerKey) : null;

  const id = crypto.randomUUID();
  const { token, ...settings } = input;
  // The count and the insert run under a per-workspace lock, so parallel
  // submissions cannot slip past the rate limit together.
  const inserted = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${workspaceId}))`);
    const [recent] = await tx
      .select({ total: count() })
      .from(jobs)
      .where(and(eq(jobs.owner, workspaceId), gt(jobs.created, Date.now() - JOB_RATE_WINDOW_MS)));
    if ((recent?.total ?? 0) >= JOB_RATE_LIMIT)
      throw new HttpError(429, 'Please wait a minute before creating more.', {
        'Retry-After': '60',
      });
    return tx
      .insert(jobs)
      .values({
        id,
        owner: workspaceId,
        token,
        prompt: input.prompt,
        model: input.model,
        kind: input.kind,
        settings,
        status: 'processing',
        created: Date.now(),
      })
      .onConflictDoNothing({ target: [jobs.owner, jobs.token] })
      .returning({ id: jobs.id });
  });
  if (!inserted.length) {
    // A concurrent request with the same token won the unique index.
    const winner = await findByToken(context, workspaceId, token);
    if (!winner) throw new Error('Job vanished after an idempotency conflict.');
    return { job: winner, created: false };
  }

  if (endpoint === null) {
    defer(() =>
      renderPreview(context, workspaceId, id, input).catch(() =>
        failJob(context, workspaceId, id, 'Preview render failed. Try again.'),
      ),
    );
  } else {
    // Submission failures are recorded on the job so they stay visible in history.
    try {
      const submission = await callProvider<ProviderSubmission>(
        providerKey,
        endpoint,
        providerPayload(input),
      );
      if (!submission.request_id) throw new Error('Provider did not return a request identifier.');
      await db.update(jobs).set({ provider: submission.request_id }).where(eq(jobs.id, id));
    } catch (error) {
      await failJob(context, workspaceId, id, messageOf(error));
    }
  }
  return { job: { id, status: 'processing' }, created: true };
}

/** Copies finished provider media into our own storage and completes the job. */
async function storeResult(
  deps: Dependencies,
  workspaceId: string,
  job: JobRow,
  status: ProviderStatus,
) {
  const source = status.video?.url ?? status.images?.[0]?.url;
  if (!source) throw new Error('Result contains no media.');
  if (new URL(source).protocol !== 'https:') throw new Error('Invalid media URL');
  const media = await fetch(source, { signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
  if (!media.ok) throw new Error('Could not store generated media.');
  const bytes = await media.arrayBuffer();
  if (bytes.byteLength > MAX_RESULT_BYTES)
    throw new Error('Generated media is too large to store.');

  const key = mediaKey(workspaceId, job.id);
  await deps.storage.put(
    key,
    bytes,
    media.headers.get('Content-Type') ?? 'application/octet-stream',
  );
  if (await completeJob(deps, workspaceId, job, job.model)) {
    job.status = 'completed';
    job.asset = job.id;
  } else {
    await deps.storage.remove(key);
  }
}

/** Brings one in-flight provider job up to date. Mutates `job` for the response. */
async function refreshJob(
  deps: Dependencies,
  workspaceId: string,
  providerKey: string,
  job: JobRow,
) {
  try {
    const status = await callProvider<ProviderStatus>(
      providerKey,
      `/requests/${encodeURIComponent(job.provider ?? '')}/status`,
    );
    if (status.status === 'completed') {
      await storeResult(deps, workspaceId, job, status);
    } else if (PROVIDER_FAILURES.includes(status.status as ProviderFailure)) {
      const reason = typeof status.error === 'string' ? status.error : status.error?.message;
      job.status = status.status as ProviderFailure;
      job.error = reason?.slice(0, 500) || 'Generation did not complete.';
      await deps.db
        .update(jobs)
        .set({ status: job.status, error: job.error })
        .where(inProgress(workspaceId, job.id));
    }
  } catch (error) {
    // Transient: the job stays in progress and is retried on the next listing.
    job.pollError = messageOf(error);
  }
}

export async function listJobs(
  deps: Dependencies,
  workspaceId: string,
  providerKey: string,
  page: PageQuery,
) {
  const rows: JobRow[] = await selectJobs(deps, workspaceId, page);
  if (providerKey) {
    const inFlight = rows
      .filter((job) => job.provider && job.status === 'processing')
      .slice(0, MAX_PROVIDER_POLLS_PER_REQUEST);
    await Promise.all(inFlight.map((job) => refreshJob(deps, workspaceId, providerKey, job)));
  }
  return rows;
}

export async function cancelJob(
  { db }: Dependencies,
  workspaceId: string,
  jobId: string,
  providerKey: string,
) {
  const [job] = await db
    .select({ status: jobs.status, provider: jobs.provider })
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.owner, workspaceId)));
  if (!job) throw new HttpError(404, 'Job not found');
  if (job.status !== 'processing') throw new HttpError(409, 'This job has already finished.');
  if (job.provider) {
    if (!providerKey) throw new HttpError(401, 'Reconnect your provider key to cancel.');
    await callProvider(providerKey, `/requests/${encodeURIComponent(job.provider)}/cancel`, {});
  }
  await db.update(jobs).set({ status: 'canceled' }).where(inProgress(workspaceId, jobId));
}
