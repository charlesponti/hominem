import { authDb } from '@hominem/db';
import type { Context } from 'hono';

import { betterAuthServer } from '../../auth/better-auth';
import { env } from '../../env';
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
): Promise<BetterAuthSessionContext | null> {
  const session = await betterAuthServer.api.getSession({ headers: c.req.raw.headers });

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

function buildBetterAuthUrl(input: { request: Request; path?: string; preserveQuery?: boolean }) {
  const requestUrl = new URL(input.request.url);
  const targetPath = input.path ? `/api/auth${input.path}` : requestUrl.pathname;
  const targetUrl = new URL(targetPath, env.API_URL);

  if (input.preserveQuery) targetUrl.search = requestUrl.search;

  return targetUrl;
}

function ensureTrustedOrigin(headers: Headers) {
  if (!headers.get('origin')) headers.set('origin', env.API_URL);
}

export async function callBetterAuthPluginEndpoint(input: {
  request: Request;
  path: string;
  method: 'GET' | 'POST';
  preserveQuery?: boolean;
  body?: Record<string, unknown>;
}) {
  const url = buildBetterAuthUrl(input);
  const headers = new Headers(input.request.headers);
  ensureTrustedOrigin(headers);
  if (input.body) headers.set('content-type', 'application/json');

  return betterAuthServer.handler(
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
