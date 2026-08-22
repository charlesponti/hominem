import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppContext, RpcUser } from '../middleware/auth';
import { requestIdMiddleware } from '../middleware/auth';
import { apiErrorHandler } from '../middleware/error';

const mocks = vi.hoisted(() => ({ recordBrowserSpeechTelemetry: vi.fn() }));

vi.mock('../../application/telemetry.service', () => mocks);

import { telemetryRoutes } from './telemetry';

const testUser: RpcUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'telemetry@example.com',
  name: 'Telemetry Test User',
  emailVerified: true,
  image: null,
  isAdmin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createApp(authenticated = true) {
  const app = new Hono<AppContext>().onError(apiErrorHandler).use(requestIdMiddleware);

  if (authenticated) {
    app.use('*', async (c, next) => {
      c.set('auth', { user: testUser, userId: testUser.id, credential: 'session', scopes: [] });
      await next();
    });
  }

  return app.route('/api/telemetry', telemetryRoutes);
}

describe('telemetry routes', () => {
  beforeEach(() => mocks.recordBrowserSpeechTelemetry.mockReset());

  it('requires authentication', async () => {
    const response = await createApp(false).request('/api/telemetry/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        type: 'speech_playback',
        outcome: 'completed',
        requestToFirstPlayableMs: 250,
        sessionDurationMs: 1_000,
      }),
    });

    expect(response.status).toBe(401);
  });

  it('accepts a valid bounded speech playback event', async () => {
    const event = {
      version: 1,
      type: 'speech_playback',
      outcome: 'completed',
      requestToFirstPlayableMs: 250,
      sessionDurationMs: 1_000,
    } as const;
    const response = await createApp().request('/api/telemetry/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    expect(response.status).toBe(204);
    expect(mocks.recordBrowserSpeechTelemetry).toHaveBeenCalledWith(event);
  });

  it('rejects unsupported fields and out-of-range durations', async () => {
    const response = await createApp().request('/api/telemetry/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 1,
        type: 'speech_playback',
        outcome: 'completed',
        requestToFirstPlayableMs: 250,
        sessionDurationMs: 700_000,
        messageId: 'must-not-be-accepted',
      }),
    });

    expect(response.status).toBe(400);
    expect(mocks.recordBrowserSpeechTelemetry).not.toHaveBeenCalled();
  });
});
