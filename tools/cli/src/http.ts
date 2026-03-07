import { AuthError, getAccessToken } from '@/utils/auth';

import type { JsonValue } from './contracts';

import { CliError } from './errors';

interface HttpJsonOptions {
  method?: 'GET' | 'POST';
  baseUrl: string;
  path: string;
  body?: string;
  requireAuth?: boolean;
  abortSignal: AbortSignal;
}

export function parseJsonPayload(raw: string, source: string): JsonValue {
  try {
    return JSON.parse(raw) as JsonValue;
  } catch {
    throw new CliError({
      code: 'DEPENDENCY_RESPONSE_INVALID',
      category: 'dependency',
      message: `Invalid JSON response from ${source}`,
    });
  }
}

interface ApiErrorPayload {
  error?: string;
  message?: string;
}

function toAbsoluteUrl(baseUrl: string, routePath: string): string {
  const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`;
  return new URL(normalizedPath, baseUrl).toString();
}

function toApiErrorMessage(status: number, payload: ApiErrorPayload | null): string {
  if (payload?.error) {
    return payload.error;
  }

  if (payload?.message) {
    return payload.message;
  }

  return `Request failed with status ${status}`;
}

export async function requestJson(options: HttpJsonOptions): Promise<string> {
  const headers = new Headers();
  headers.set('content-type', 'application/json');

  if (options.requireAuth ?? true) {
    let token: string | null;
    try {
      token = await getAccessToken({
        expectedIssuerBaseUrl: options.baseUrl,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        throw new CliError({
          code: error.code,
          category: error.category,
          message: error.message,
          hint: error.hint,
        });
      }
      throw error;
    }
    if (!token) {
      throw new CliError({
        code: 'AUTH_REQUIRED',
        category: 'auth',
        message: 'Authentication required',
        hint: 'Run `hominem auth login`',
      });
    }
    headers.set('authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(toAbsoluteUrl(options.baseUrl, options.path), {
      method: options.method ?? 'GET',
      headers,
      body: options.body,
      signal: options.abortSignal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new CliError({
        code: 'DEPENDENCY_TIMEOUT',
        category: 'dependency',
        message: 'Request aborted or timed out',
      });
    }
    throw new CliError({
      code: 'DEPENDENCY_UNAVAILABLE',
      category: 'dependency',
      message: error instanceof Error ? error.message : 'Dependency unavailable',
    });
  }

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = null;
    }

    if (response.status === 401 || response.status === 403) {
      throw new CliError({
        code: 'AUTH_INVALID',
        category: 'auth',
        message: toApiErrorMessage(response.status, payload),
        hint: 'Run `hominem auth login` to refresh credentials',
      });
    }

    throw new CliError({
      code: 'DEPENDENCY_RESPONSE_ERROR',
      category: 'dependency',
      message: toApiErrorMessage(response.status, payload),
      details: {
        status: response.status,
      },
    });
  }

  return response.text();
}
