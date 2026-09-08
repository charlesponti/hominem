import type { RouteConfigEntry } from '@react-router/dev/routes';
import { describe, expect, it } from 'vitest';

import routes from './routes';

function collectPaths(entries: RouteConfigEntry[]): string[] {
  return entries.flatMap((entry) => [
    ...(entry.path ? [entry.path] : []),
    ...(entry.children ? collectPaths(entry.children) : []),
  ]);
}

describe('finance app route config', () => {
  const paths = collectPaths(routes);

  it('registers the scoped job-cancel route', () => {
    expect(paths).toContain('api/finance/import/jobs/:jobId/cancel');
  });

  it('does not register an unscoped job-cancel alias', () => {
    // Matches a 404 test on the old services/api route we replaced.
    expect(paths).not.toContain('api/finance/import/:jobId/cancel');
  });
});
