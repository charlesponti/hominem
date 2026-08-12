import { createContext, redirect, type RouterContext } from 'react-router';

import { getServerSession, type User } from './auth.server';

export const userContext = createContext<User | null>(null);

type MiddlewareContext = {
  get: <T>(key: RouterContext<T>) => T;
  set: <T>(key: RouterContext<T>, value: T) => void;
};

type SharedMiddlewareArgs = {
  request: Request;
  context: MiddlewareContext;
};

type SharedMiddlewareNext = () => Promise<Response>;

function isApiRequest(path: string): boolean {
  return path === '/api' || path.startsWith('/api/');
}

function unauthorizedResponse(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (isApiRequest(path)) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const next = encodeURIComponent(url.pathname + url.search);
  return redirect(`/auth?next=${next}`);
}

export async function sessionMiddleware(
  { request, context }: SharedMiddlewareArgs,
  next: SharedMiddlewareNext,
): Promise<Response | void> {
  if (new URL(request.url).pathname === '/health') {
    return next();
  }

  const { user, headers } = await getServerSession(request);
  if (user) {
    context.set(userContext, user);
  }

  const response = await next();
  for (const setCookie of headers.getSetCookie()) response.headers.append('set-cookie', setCookie);
  return response;
}

export async function requireAuthMiddleware(
  { request, context }: SharedMiddlewareArgs,
  next: SharedMiddlewareNext,
): Promise<Response | void> {
  const user = context.get(userContext);

  if (!user) {
    return unauthorizedResponse(request);
  }

  return next();
}
