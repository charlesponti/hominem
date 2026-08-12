import { describe, expect, it } from 'vitest';

import {
  buildHostedLoginUrl,
  resolveAppRedirectUrl,
  resolveAuthRedirect,
  resolveOAuthResumeUrl,
} from './redirect-policy.js';

describe('buildHostedLoginUrl', () => {
  it('builds a trusted absolute return URL from a local app path', () => {
    expect(
      buildHostedLoginUrl({
        apiBaseUrl: 'https://api.ponti.io',
        appOrigin: 'https://career.ponti.io',
        next: '/work?view=month',
        fallback: '/work',
        allowedPrefixes: ['/work'],
      }),
    ).toBe('https://api.ponti.io/login?next=https%3A%2F%2Fcareer.ponti.io%2Fwork%3Fview%3Dmonth');
  });
});

describe('resolveAuthRedirect', () => {
  it('falls back when redirect is missing', () => {
    expect(resolveAuthRedirect(null, '/notes')).toEqual({
      safeRedirect: '/notes',
      rejectedReason: 'missing',
      rejectedPathname: null,
    });
  });

  it('rejects non-local redirects', () => {
    expect(resolveAuthRedirect('https://evil.example', '/notes', ['/notes'])).toEqual({
      safeRedirect: '/notes',
      rejectedReason: 'non_local',
      rejectedPathname: null,
    });
  });

  it('rejects protocol-relative redirects', () => {
    expect(resolveAuthRedirect('//evil.example', '/notes', ['/notes'])).toEqual({
      safeRedirect: '/notes',
      rejectedReason: 'protocol_relative',
      rejectedPathname: null,
    });
  });

  it('preserves query strings and hashes for allowed redirects', () => {
    expect(resolveAuthRedirect('/notes/inbox?tab=today#top', '/notes', ['/notes'])).toEqual({
      safeRedirect: '/notes/inbox?tab=today#top',
      rejectedReason: null,
      rejectedPathname: null,
    });
  });

  it('rejects disallowed paths', () => {
    expect(resolveAuthRedirect('/admin', '/notes', ['/notes', '/settings'])).toEqual({
      safeRedirect: '/notes',
      rejectedReason: 'disallowed',
      rejectedPathname: '/admin',
    });
  });

  it('normalizes trailing slashes in allowed prefixes', () => {
    expect(resolveAuthRedirect('/notes/archive', '/notes', ['/notes/'])).toEqual({
      safeRedirect: '/notes/archive',
      rejectedReason: null,
      rejectedPathname: null,
    });
  });
});

describe('resolveOAuthResumeUrl', () => {
  const apiBaseUrl = 'http://localhost:4040';
  const authorizeSearch =
    '?response_type=code&client_id=abc123&redirect_uri=http%3A%2F%2Flocalhost%3A61531%2Fcallback&state=xyz';

  it('builds the API authorize URL, forwarding the original query string', () => {
    expect(resolveOAuthResumeUrl(authorizeSearch, apiBaseUrl)).toBe(
      `${apiBaseUrl}/api/auth/mcp/authorize${authorizeSearch}`,
    );
  });

  it('returns null when required OAuth params are missing', () => {
    expect(resolveOAuthResumeUrl('?foo=bar', apiBaseUrl)).toBeNull();
  });

  it('returns null when response_type is not "code"', () => {
    expect(
      resolveOAuthResumeUrl(
        '?response_type=token&client_id=abc123&redirect_uri=http%3A%2F%2Flocalhost%2Fcallback',
        apiBaseUrl,
      ),
    ).toBeNull();
  });

  it('ignores an attacker-supplied host — destination host always comes from apiBaseUrl', () => {
    const maliciousSearch =
      '?response_type=code&client_id=abc&redirect_uri=http%3A%2F%2Fevil.example%2Fcallback&host=evil.example';
    const result = resolveOAuthResumeUrl(maliciousSearch, apiBaseUrl);
    expect(result).not.toBeNull();
    expect(new URL(result!).origin).toBe(apiBaseUrl);
  });
});

describe('resolveAppRedirectUrl', () => {
  const allowedOrigins = ['https://labs.ponti.io', 'https://career.ponti.io'];

  it('returns null when next is missing', () => {
    expect(resolveAppRedirectUrl(null, allowedOrigins)).toBeNull();
    expect(resolveAppRedirectUrl(undefined, allowedOrigins)).toBeNull();
    expect(resolveAppRedirectUrl('', allowedOrigins)).toBeNull();
  });

  it('returns null when next is not a valid URL', () => {
    expect(resolveAppRedirectUrl('/relative/path', allowedOrigins)).toBeNull();
    expect(resolveAppRedirectUrl('not a url', allowedOrigins)).toBeNull();
  });

  it('returns null when the origin is not allow-listed', () => {
    expect(resolveAppRedirectUrl('https://evil.example/steal', allowedOrigins)).toBeNull();
  });

  it('rejects non-http(s) protocols even if the origin string matches', () => {
    expect(resolveAppRedirectUrl('javascript:alert(1)', ['javascript:alert(1)'])).toBeNull();
  });

  it('returns the URL unchanged when the origin is allow-listed', () => {
    expect(
      resolveAppRedirectUrl('https://labs.ponti.io/games/realitea?foo=bar#top', allowedOrigins),
    ).toBe('https://labs.ponti.io/games/realitea?foo=bar#top');
  });

  it('matches origin only — path is irrelevant to the allowlist', () => {
    expect(resolveAppRedirectUrl('https://career.ponti.io/anything/at/all', allowedOrigins)).toBe(
      'https://career.ponti.io/anything/at/all',
    );
  });
});
