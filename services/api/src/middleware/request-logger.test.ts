import {
  getHttpRequestInLogMessage,
  getHttpRequestLogLevel,
  getHttpRequestOutLogMessage,
  logger,
} from '@hominem/utils/logger';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { requestLogger } from './request-logger';

describe('requestLogger', () => {
  it('logs request details through the shared logger', async () => {
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const app = new Hono();

    app.use('*', requestLogger());
    app.get('/api/auth/session', (c) => c.body(null, 401));

    await app.request('http://localhost/api/auth/session');

    expect(infoSpy).toHaveBeenCalledTimes(2);
    expect(infoSpy).toHaveBeenNthCalledWith(1, getHttpRequestInLogMessage(), {
      method: 'GET',
      path: '/api/auth/session',
    });
    expect(infoSpy).toHaveBeenNthCalledWith(2, getHttpRequestOutLogMessage(), {
      durationMs: expect.any(Number),
      method: 'GET',
      path: '/api/auth/session',
      status: 401,
    });

    infoSpy.mockRestore();
  });

  it('uses the computed log level for slow requests', async () => {
    const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const app = new Hono();

    let tick = 0;
    const nowSpy = vi.spyOn(globalThis.performance, 'now').mockImplementation(() => {
      tick += 1000;
      return tick;
    });

    app.use('*', requestLogger());
    app.get('/api/status', (c) => c.json({ ok: true }));

    await app.request('http://localhost/api/status');

    expect(infoSpy).toHaveBeenCalledWith(getHttpRequestInLogMessage(), {
      method: 'GET',
      path: '/api/status',
    });

    expect(
      getHttpRequestLogLevel({
        durationMs: 1000,
        method: 'GET',
        path: '/api/status',
        status: 200,
      }),
    ).toBe('warn');
    expect(warnSpy).toHaveBeenCalledWith(getHttpRequestOutLogMessage(), {
      durationMs: 1000,
      method: 'GET',
      path: '/api/status',
      status: 200,
    });

    infoSpy.mockRestore();
    nowSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
