import type { careerRoutes } from '@hominem/api/career';
import { customFetch } from '@hominem/rpc/fetch';
import { hc } from 'hono/client';

import { serverEnv } from './env.server';

export function createServerHonoClient(request?: Request) {
  const career = hc<typeof careerRoutes>(
    new URL('/api/career', serverEnv.HOMINEM_INTERNAL_API_URL).toString(),
    {
      fetch: customFetch({
        baseUrl: serverEnv.HOMINEM_INTERNAL_API_URL,
        request,
        throwOnError: false,
      }),
    },
  );

  return { career };
}

export async function fetchCareerProfile(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const { career } = createServerHonoClient(request);
  const res = await career.profile.$get();
  const data = await res.json();
  return data.profile;
}

export async function fetchCareerEngagements(
  request: Request,
  query?: { type?: string; limit?: number },
): Promise<{ engagements: Record<string, unknown>[] }> {
  const { career } = createServerHonoClient(request);
  const params = new URLSearchParams();
  if (query?.type) params.set('type', query.type);
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  const res = await career.engagements.$get({
    query: qs ? Object.fromEntries(params.entries()) : {},
  });
  const data = await res.json();
  return data;
}

export async function fetchCareerApplications(
  request: Request,
  query?: { status?: string; limit?: number },
): Promise<{ applications: Record<string, unknown>[] }> {
  const { career } = createServerHonoClient(request);
  const params = new URLSearchParams();
  if (query?.status) params.set('status', query.status);
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  const res = await career.applications.$get({
    query: qs ? Object.fromEntries(params.entries()) : {},
  });
  const data = await res.json();
  return data;
}

export async function fetchCareerApplicationDetail(
  request: Request,
  id: string,
): Promise<{ application: Record<string, unknown> | null }> {
  const { career } = createServerHonoClient(request);
  const res = await career.applications[':id'].$get({ param: { id } });
  const data = await res.json();
  return data;
}

export async function fetchCareerEducation(
  request: Request,
  query?: { limit?: number },
): Promise<{ education: Record<string, unknown>[] }> {
  const { career } = createServerHonoClient(request);
  const params = new URLSearchParams();
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  const res = await career.education.$get({
    query: qs ? Object.fromEntries(params.entries()) : {},
  });
  const data = await res.json();
  return data;
}
