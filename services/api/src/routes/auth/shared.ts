import { authDb } from '@hominem/db/core';
import type { Context } from 'hono';

import { betterAuthServer } from '../../auth/better-auth';
import { env } from '../../env';
import type { ApiEnv } from '../../env.schema';
import type { AppEnv } from '../../server';

export interface AppSessionResponse {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
    isAdmin: boolean;
    createdAt?: string;
    updatedAt?: string;
  } | null;
}

export type AuthDependencies = {
  env: ApiEnv;
  auth: typeof betterAuthServer;
};

interface BetterAuthSessionContext {
  sessionId: string;
  userId: string;
}

export function copyHeadersWithSetCookie(headers: Headers) {
  const copied = new Headers(headers);
  const setCookies = headers.getSetCookie();

  if (setCookies.length > 0) {
    copied.delete('set-cookie');
    for (const setCookie of setCookies) copied.append('set-cookie', setCookie);
  }

  return copied;
}

export async function getBetterAuthSessionContext(
  c: Context<AppEnv>,
  auth: typeof betterAuthServer = betterAuthServer,
): Promise<BetterAuthSessionContext | null> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user?.id || !session.session?.id) return null;

  return { sessionId: session.session.id, userId: session.user.id };
}

export async function buildSessionResponse(input: {
  sessionId: string;
  userId: string;
}): Promise<AppSessionResponse | null> {
  const userRecord = await authDb
    .selectFrom('user')
    .selectAll()
    .where('id', '=', input.userId)
    .executeTakeFirst();

  if (!userRecord) return null;

  return {
    isAuthenticated: true,
    user: {
      id: userRecord.id,
      email: userRecord.email,
      ...(userRecord.name ? { name: userRecord.name } : {}),
      isAdmin: false,
      ...(userRecord.createdAt ? { createdAt: userRecord.createdAt } : {}),
      ...(userRecord.updatedAt ? { updatedAt: userRecord.updatedAt } : {}),
    },
  };
}

function buildBetterAuthUrl(
  input: { request: Request; path?: string; preserveQuery?: boolean },
  inputEnv: ApiEnv,
) {
  const requestUrl = new URL(input.request.url);
  const targetPath = input.path ? `/api/auth${input.path}` : requestUrl.pathname;
  const targetUrl = new URL(targetPath, inputEnv.API_URL);

  if (input.preserveQuery) targetUrl.search = requestUrl.search;

  return targetUrl;
}

function ensureTrustedOrigin(headers: Headers, inputEnv: ApiEnv) {
  if (!headers.get('origin')) headers.set('origin', inputEnv.API_URL);
}

export async function callBetterAuthPluginEndpoint(input: {
  request: Request;
  path: string;
  method: 'GET' | 'POST';
  preserveQuery?: boolean;
  body?: Record<string, unknown>;
  dependencies?: AuthDependencies;
}) {
  const dependencies = input.dependencies ?? { env, auth: betterAuthServer };
  const url = buildBetterAuthUrl(input, dependencies.env);
  const headers = new Headers(input.request.headers);
  ensureTrustedOrigin(headers, dependencies.env);
  if (input.body) headers.set('content-type', 'application/json');

  return dependencies.auth.handler(
    new Request(url.toString(), {
      method: input.method,
      headers,
      ...(input.body ? { body: JSON.stringify(input.body) } : {}),
    }),
  );
}

export function jsonWithHeaders(body: Record<string, unknown>, status: number, headers?: Headers) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('content-type', 'application/json');
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}
