import type { Controller } from './context.ts';
import { HttpError } from './http.ts';

export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface Route {
  method: Method;
  /** Path with `:name` placeholders, e.g. `/api/assets/:id`. */
  path: string;
  controller: Controller;
}

export interface RouteMatch {
  controller: Controller;
  params: Record<string, string>;
}

export const route = (method: Method, path: string, controller: Controller): Route => ({
  method,
  path,
  controller,
});

const compile = (path: string) =>
  new RegExp(`^${path.replace(/:([a-zA-Z]+)/g, (_, name: string) => `(?<${name}>[^/]+)`)}$`);

export function createRouter(routes: Route[]) {
  const compiled = routes.map((entry) => ({ ...entry, pattern: compile(entry.path) }));

  /** Resolves a request to a controller, or throws 404 / 405. */
  return function match(method: string, pathname: string): RouteMatch {
    const candidates = compiled.filter((entry) => entry.pattern.test(pathname));
    if (!candidates.length) throw new HttpError(404, 'Not found');
    const found = candidates.find((entry) => entry.method === method);
    if (!found) {
      const allow = [...new Set(candidates.map((entry) => entry.method))].join(', ');
      throw new HttpError(405, 'Method not allowed', { Allow: allow });
    }
    return { controller: found.controller, params: found.pattern.exec(pathname)?.groups ?? {} };
  };
}

/** Reads a required path parameter. */
export function param(params: Record<string, string>, name: string): string {
  const value = params[name];
  if (!value) throw new HttpError(404, 'Not found');
  return value;
}
