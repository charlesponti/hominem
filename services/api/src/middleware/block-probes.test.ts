import { describe, expect, test, vi } from 'vitest';

// avoid requiring the real api-reference package during unit tests
vi.mock('@scalar/hono-api-reference', () => ({
  apiReference: () => () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (c: any) => {
      return c.text('docs-mock');
    };
  },
}));

import { createServer } from '../server';

// These tests ensure our middleware rejects common malicious probe
// paths (WordPress scanners, xmlrpc, git leaks, etc.) while allowing normal
// API traffic.

describe('blockMaliciousProbes middleware', () => {
  test('returns 404 for various malicious probe paths', async () => {
    const app = createServer();
    const paths = [
      '/wp-includes/wlwmanifest.xml',
      '/blog/wp-includes/wlwmanifest.xml',
      '/news/wp-includes/wlwmanifest.xml',
      '/shop/wp-includes/wlwmanifest.xml',
      '//blog/wp-includes/wlwmanifest.xml',
      '/2018/wp-includes/wlwmanifest.xml',
      '/xmlrpc.php',
      '/wp-login.php',
      '/.git/config',
      '/phpmyadmin/',
      '/.env',
      '/dump.sql',
    ];

    for (const path of paths) {
      const res = await app.request(path);
      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe('Not found');
    }
  });

  test('does not interfere with legitimate routes', async () => {
    const app = createServer();
    const res = await app.request('/api/status');
    expect([200, 503]).toContain(res.status);
  });
});
