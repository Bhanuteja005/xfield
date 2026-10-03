import { folderInput, projectInput } from '@xfield/shared';
import * as projectService from '../services/project.service.ts';
import type { Controller } from '../shared/context.ts';
import { json } from '../shared/http.ts';
import { param } from '../shared/router.ts';

export const listFolders: Controller = async (context) =>
  json(await projectService.listFolders(context, context.workspaceId));

export const createFolder: Controller = async (context) => {
  const { name } = folderInput.parse(await context.request.json());
  return json(await projectService.createFolder(context, context.workspaceId, name), 201);
};

export const renameFolder: Controller = async (context) => {
  const { name } = folderInput.parse(await context.request.json());
  await projectService.renameFolder(
    context,
    context.workspaceId,
    param(context.params, 'id'),
    name,
  );
  return json({ ok: true });
};

export const deleteFolder: Controller = async (context) => {
  await projectService.deleteFolder(context, context.workspaceId, param(context.params, 'id'));
  return json({ ok: true });
};

export const listProjects: Controller = async (context) =>
  json(await projectService.listProjects(context, context.workspaceId));

export const createProject: Controller = async (context) => {
  const input = projectInput.parse(await context.request.json());
  return json(await projectService.createProject(context, context.workspaceId, input), 201);
};

export const updateProject: Controller = async (context) => {
  const input = projectInput.parse(await context.request.json());
  await projectService.updateProject(
    context,
    context.workspaceId,
    param(context.params, 'id'),
    input,
  );
  return json({ ok: true });
};

export const deleteProject: Controller = async (context) => {
  await projectService.deleteProject(context, context.workspaceId, param(context.params, 'id'));
  return json({ ok: true });
};
