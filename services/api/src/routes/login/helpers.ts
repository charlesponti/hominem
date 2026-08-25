import {
  resolveAppRedirectUrl,
  resolveOAuthResumeUrl,
} from '@ponti-studios/auth/shared/redirect-policy';
import { z } from 'zod';

import { getTrustedOrigins } from '../../auth/better-auth';
import { env } from '../../env';
import { MCP_SCOPES } from '../../scopes';

export const emailSchema = z.string().email();
export const otpSchema = z.string().length(6);

export type ResumeMode = 'app' | 'oauth';
export type Resume = { mode: ResumeMode; url: string };

export function getFormValue(form: Record<string, string | File>, name: string) {
  const value = form[name];
  return typeof value === 'string' ? value : '';
}

export function resolveResume(query: string): Resume | null {
  const params = new URLSearchParams(query);
  const next = params.get('next');
  if (next !== null) {
    const url = resolveAppRedirectUrl(next, getTrustedOrigins());
    return url ? { mode: 'app', url } : null;
  }

  const url = resolveOAuthResumeUrl(query, env.API_URL);
  return url ? { mode: 'oauth', url } : null;
}

export function loginUrl(input: {
  email?: string;
  error?: string;
  resumeQuery: string;
  step: 'email' | 'otp';
}) {
  const url = new URL('/login', env.API_URL);
  const query = new URLSearchParams(input.resumeQuery);
  query.set('step', input.step);
  if (input.email) query.set('email', input.email);
  if (input.error) query.set('error', input.error);
  url.search = query.toString();
  return url.toString();
}

export function resolveConsentQuery(query: string) {
  const params = new URLSearchParams(query);
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const signature = params.get('sig');
  const expiry = Number(params.get('exp'));
  if (!clientId || !redirectUri || !signature || !Number.isSafeInteger(expiry)) return null;
  if (expiry <= Math.floor(Date.now() / 1000)) return null;
  const scopeSet = new Set<string>(MCP_SCOPES);
  const scopes = (params.get('scope') ?? '').split(' ').filter((scope) => scopeSet.has(scope));
  return { clientId, scopes, query };
}
