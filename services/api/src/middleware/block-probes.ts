import type { MiddlewareHandler } from 'hono';

// Middleware to intercept a variety of automated probes, scanners, and
// other malicious requests that target known application paths. These
// requests are noise and don't require any business logic, so we return a
// generic 404 immediately to keep our logs clean and avoid wasted CPU.
const PROBE_REGEXES: RegExp[] = [
  // WordPress WLW manifest scans under any prefix
  /^\/+(?:[^/]+\/)*wp-includes\/wlwmanifest\.xml$/i,
  // XML-RPC endpoint often targeted by brute-force attempts
  /^\/+xmlrpc\.php$/i,
  // WP login/admin pages
  /^\/+wp-(?:admin|login)\.php$/i,
  // Git repo configuration leakage
  /^\/+\.git\/config$/i,
  // phpMyAdmin / Adminer / PMA interfaces
  /^\/+(?:phpmyadmin|adminer|pma)\/?.*$/i,
  // Backup and environment dumps
  /^\/+(?:\.env|wp-config\.php|configuration\.php)$/i,
  // Generic database dump attempts
  /^\/+dump(?:\.sql)?$/i,
];

export function blockMaliciousProbes(): MiddlewareHandler {
  return async (c, next) => {
    const path = c.req.path;
    for (const re of PROBE_REGEXES) {
      if (re.test(path)) {
        // respond with purposefully unhelpful 404 to discourage scanners and
        // ensure we don't incur any further work (e.g. auth checks, logging).
        return c.text('Not found', 404);
      }
    }

    return await next();
  };
}
