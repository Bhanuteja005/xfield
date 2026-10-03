import { generationInput, pageQuery } from '@xfield/shared';
import * as generationService from '../services/generation.service.ts';
import type { Controller } from '../shared/context.ts';
import { json } from '../shared/http.ts';
import { param } from '../shared/router.ts';
import { providerKey } from './account.controller.ts';

export const createJob: Controller = async (context) => {
  const input = generationInput.parse(await context.request.json());
  const { job, created } = await generationService.createJob(
    context,
    context.workspaceId,
    input,
    providerKey(context.request),
  );
  return json(job, created ? 201 : 200);
};

export const listJobs: Controller = async (context) =>
  json(
    await generationService.listJobs(
      context,
      context.workspaceId,
      providerKey(context.request),
      pageQuery.parse(Object.fromEntries(context.url.searchParams)),
    ),
  );

export const cancelJob: Controller = async (context) => {
  await generationService.cancelJob(
    context,
    context.workspaceId,
    param(context.params, 'id'),
    providerKey(context.request),
  );
  return json({ ok: true });
};
