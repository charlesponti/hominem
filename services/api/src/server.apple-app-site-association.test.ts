import { describe, expect, test } from 'vitest';

import { importServerWithEnv } from './routes/test-helpers/auth';

describe('apple app site association route', () => {
  test('serves webcredentials app ids for mobile variants', { timeout: 15000 }, async () => {
    const createServer = await importServerWithEnv({ APPLE_TEAM_ID: '3QHJ2KN8AL' });
    const app = createServer();

    const response = await app.request('http://localhost/.well-known/apple-app-site-association');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');

    const body = (await response.json()) as {
      webcredentials: {
        apps: string[];
      };
    };

    expect(body.webcredentials.apps).toEqual([
      '3QHJ2KN8AL.com.pontistudios.hakumi',
      '3QHJ2KN8AL.com.pontistudios.hakumi.preview',
      '3QHJ2KN8AL.com.pontistudios.hakumi.dev',
      '3QHJ2KN8AL.com.pontistudios.hakumi.e2e',
    ]);
  });
});
