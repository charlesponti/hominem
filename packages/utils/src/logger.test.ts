import { describe, expect, it, vi } from 'vitest';

import {
  getHttpRequestInLogMessage,
  getHttpRequestLogLevel,
  getHttpRequestOutLogMessage,
  logger,
  registerLogSink,
} from './logger';

describe('logger helpers', () => {
  it('returns stable request lifecycle log messages', () => {
    expect(getHttpRequestInLogMessage()).toBe('http_request_in');
    expect(getHttpRequestOutLogMessage()).toBe('http_request_out');
  });

  it('logs 5xx requests as errors', () => {
    expect(
      getHttpRequestLogLevel({
        durationMs: 25,
        method: 'GET',
        path: '/api/status',
        status: 500,
      }),
    ).toBe('error');
  });

  it('logs slow successful requests as warnings', () => {
    expect(
      getHttpRequestLogLevel({
        durationMs: 1000,
        method: 'GET',
        path: '/api/status',
        status: 200,
      }),
    ).toBe('warn');
  });

  it('keeps routine client errors and fast requests at info', () => {
    expect(
      getHttpRequestLogLevel({
        durationMs: 3,
        method: 'GET',
        path: '/api/auth/session',
        status: 401,
      }),
    ).toBe('info');
  });

  it('forwards log entries to registered sinks', () => {
    const sink = vi.fn();
    const unregister = registerLogSink(sink);

    logger.info('test_log', { requestId: 'req_123' });

    expect(sink).toHaveBeenCalledWith({
      data: { requestId: 'req_123' },
      level: 'info',
      message: 'test_log',
      timestamp: expect.any(Number),
    });

    unregister();
  });
});
