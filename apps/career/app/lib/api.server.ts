import type { careerRoutes } from '@hominem/api/career';
import { hc } from 'hono/client';

import { serverEnv } from './env';

const customFetch =
  (request?: Request): typeof fetch =>
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);

    if (request) {
      const cookie = request.headers.get('cookie');
      if (cookie) headers.set('cookie', cookie);
    }

    return fetch(input, { ...init, headers, credentials: 'include' });
  };

function createServerHonoClient(request?: Request) {
  const career = hc<typeof careerRoutes>(
    new URL('/api/career', serverEnv.VITE_PUBLIC_API_URL).toString(),
    { fetch: customFetch(request) },
  );

  return { career };
}

export async function fetchCareerProfile(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const { career } = createServerHonoClient(request);
  const res = await career.profile.$get();
  const data = await res.json();
  return (data as { profile: Record<string, unknown> | null }).profile;
}

export async function fetchCareerPositions(
  request: Request,
  query?: { type?: string; limit?: number },
): Promise<{ positions: Record<string, unknown>[] }> {
  const { career } = createServerHonoClient(request);
  const params = new URLSearchParams();
  if (query?.type) params.set('type', query.type);
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  const res = await career.positions.$get({ query: qs ? Object.fromEntries(params) : {} } as never);
  const data = await res.json();
  return data as { positions: Record<string, unknown>[] };
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
    query: qs ? Object.fromEntries(params) : {},
  } as never);
  const data = await res.json();
  return data as { applications: Record<string, unknown>[] };
}

export async function fetchCareerApplicationDetail(
  request: Request,
  id: string,
): Promise<{ application: Record<string, unknown> | null }> {
  const { career } = createServerHonoClient(request);
  const res = await career.applications[':id'].$get({ param: { id } });
  const data = await res.json();
  return data as { application: Record<string, unknown> | null };
}

export async function fetchCareerEducation(
  request: Request,
  query?: { limit?: number },
): Promise<{ education: Record<string, unknown>[] }> {
  const { career } = createServerHonoClient(request);
  const params = new URLSearchParams();
  if (query?.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  const res = await career.education.$get({ query: qs ? Object.fromEntries(params) : {} } as never);
  const data = await res.json();
  return data as { education: Record<string, unknown>[] };
}
