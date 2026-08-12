import { describe, expect, it } from 'vitest';

import { getClientIp } from './client-ip';

function request(headers: Record<string, string>) {
  return { req: { header: (name: string) => headers[name.toLowerCase()] } };
}

describe('getClientIp', () => {
  it('prefers the trusted X-Real-IP header', () => {
    expect(
      getClientIp(
        request({
          'x-real-ip': '198.51.100.10',
          'x-forwarded-for': '198.51.100.11, 203.0.113.5',
        }),
      ),
    ).toBe('198.51.100.10');
  });

  it('falls back to the first X-Forwarded-For value', () => {
    expect(getClientIp(request({ 'x-forwarded-for': '198.51.100.11, 203.0.113.5' }))).toBe(
      '198.51.100.11',
    );
  });

  it('returns unknown when no proxy identity is present', () => {
    expect(getClientIp(request({}))).toBe('unknown');
  });
});
