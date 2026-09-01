import type { GenerationWireEvent } from '@hominem/chat';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  respondToConfirmation: vi.fn(),
}));

vi.mock('../../application/chat-generation.service', () => ({
  ChatGenerationInputError: class ChatGenerationInputError extends Error {},
  chatGenerationService: {
    respondToConfirmation: mocks.respondToConfirmation,
  },
}));

import type { AppContext } from '../middleware/auth';
import { chatGenerationRoutes } from './chats.generation';

const userId = '00000000-0000-4000-8000-000000000004';

function createApp() {
  const app = new Hono<AppContext>();
  app.use('*', async (c, next) => {
    c.set('auth', {
      user: {
        id: userId,
        email: 'user@example.com',
        name: 'Test User',
        emailVerified: true,
        image: null,
        isAdmin: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      userId,
      credential: 'session',
      scopes: [],
    });
    await next();
  });
  return app.route('/api/chats/:id', chatGenerationRoutes);
}

function confirmationEvent(approved: boolean): GenerationWireEvent {
  return approved
    ? {
        version: 1,
        generationId: 'generation-1',
        sequence: 1,
        type: 'confirmation.approved',
        payload: { type: 'confirmation.approved', callId: 'call-1' },
      }
    : {
        version: 1,
        generationId: 'generation-1',
        sequence: 1,
        type: 'confirmation.rejected',
        payload: {
          type: 'confirmation.rejected',
          callId: 'call-1',
          reason: 'User rejected tool call',
        },
      };
}

describe('chat confirmation route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { approved: true, eventType: 'confirmation.approved' },
    { approved: false, eventType: 'confirmation.rejected' },
  ])('delegates $approved decisions as canonical SSE', async ({ approved, eventType }) => {
    const event = confirmationEvent(approved);
    mocks.respondToConfirmation.mockResolvedValueOnce(
      (async function* () {
        yield event;
      })(),
    );

    const response = await createApp().request(
      '/api/chats/00000000-0000-4000-8000-000000000001/messages/00000000-0000-4000-8000-000000000003/tool-calls/call-1/respond',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ approved }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(mocks.respondToConfirmation).toHaveBeenCalledWith({
      userId,
      chatId: '00000000-0000-4000-8000-000000000001',
      messageId: '00000000-0000-4000-8000-000000000003',
      toolCallId: 'call-1',
      approved,
      responseLength: undefined,
    });

    const body = await response.text();
    expect(body).toContain(`type":"${eventType}`);
    expect(body.match(/id: 1/g)).toHaveLength(1);
    expect(body.match(/data: \[DONE\]/g)).toHaveLength(1);
  });
});
