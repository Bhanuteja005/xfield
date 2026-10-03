import * as account from '../controllers/account.controller.ts';
import * as auth from '../controllers/auth.controller.ts';
import * as asset from '../controllers/asset.controller.ts';
import * as generation from '../controllers/generation.controller.ts';
import * as project from '../controllers/project.controller.ts';
import { route, type Route } from '../shared/router.ts';

/** The whole HTTP surface in one place. */
export const routes: Route[] = [
  route('GET', '/api/session', account.getSession),
  route('PATCH', '/api/profile', account.updateProfile),
  route('POST', '/api/onboarding', account.completeOnboarding),
  route('POST', '/api/key', account.saveProviderKey),
  route('DELETE', '/api/key', account.clearProviderKey),

  route('GET', '/api/auth/providers', auth.providers),
  route('POST', '/api/auth/signup', auth.signUp),
  route('POST', '/api/auth/verify', auth.verify),
  route('POST', '/api/auth/resend', auth.resend),
  route('POST', '/api/auth/signin', auth.signIn),
  route('POST', '/api/auth/recover', auth.recover),
  route('POST', '/api/auth/link', auth.signInWithLink),
  route('POST', '/api/auth/reset', auth.resetPassword),
  route('GET', '/api/auth/oauth/:provider', auth.startOAuth),
  route('GET', '/api/auth/callback', auth.finishOAuth),
  route('POST', '/api/auth/signout', auth.signOut),

  route('GET', '/api/assets', asset.listAssets),
  route('POST', '/api/assets/bulk', asset.bulkUpdateAssets),
  route('PATCH', '/api/assets/:id', asset.updateAsset),
  route('DELETE', '/api/assets/:id', asset.deleteAsset),
  route('POST', '/api/upload', asset.upload),
  route('GET', '/api/media/:id', asset.getPrivateMedia),
  route('GET', '/api/public/:id', asset.getPublicMedia),
  route('GET', '/api/community', asset.listCommunity),

  route('GET', '/api/folders', project.listFolders),
  route('POST', '/api/folders', project.createFolder),
  route('PATCH', '/api/folders/:id', project.renameFolder),
  route('DELETE', '/api/folders/:id', project.deleteFolder),
  route('GET', '/api/projects', project.listProjects),
  route('POST', '/api/projects', project.createProject),
  route('PATCH', '/api/projects/:id', project.updateProject),
  route('DELETE', '/api/projects/:id', project.deleteProject),

  route('POST', '/api/jobs', generation.createJob),
  route('GET', '/api/jobs', generation.listJobs),
  route('POST', '/api/jobs/:id/cancel', generation.cancelJob),
];
