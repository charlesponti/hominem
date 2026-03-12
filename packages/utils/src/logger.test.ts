import { describe, expect, it } from 'vitest';

import {
  getHttpRequestInLogMessage,
  getHttpRequestLogLevel,
  getHttpRequestOutLogMessage,
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
});
