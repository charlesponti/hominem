import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

const server = setupServer();

vi.mock('~/lib/env.server', () => ({
  serverEnv: { HOMINEM_INTERNAL_API_URL: 'https://internal.test' },
}));

const { loader } = await import('./chat.$chatId');

describe('chat loader SSR MSW boundary', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('preserves an upstream messages failure for the rendered recovery state', async () => {
    server.use(
      http.get('https://internal.test/api/chats/chat-1/messages', ({ request }) => {
        expect(request.headers.get('cookie')).toBe('session=disposable');
        return HttpResponse.json({ error: 'database unavailable' }, { status: 503 });
      }),
    );

    const request = new Request('https://web.test/chat/chat-1', {
      headers: { cookie: 'session=disposable' },
    });
    const result = await loader({
      request,
      params: { chatId: 'chat-1' },
      context: undefined,
      url: new URL(request.url),
      pattern: '/chat/:chatId',
    } as unknown as Parameters<typeof loader>[0]);

    expect(result.data).toMatchObject({ messages: undefined, messagesStatus: 503 });
  });

  it('preserves a second upstream HTTP failure without fabricating messages', async () => {
    server.use(
      http.get('https://internal.test/api/chats/chat-1/messages', () =>
        HttpResponse.json({ error: 'test load failure' }, { status: 500 }),
      ),
    );

    const request = new Request('https://web.test/chat/chat-1');
    const result = await loader({
      request,
      params: { chatId: 'chat-1' },
      context: undefined,
      url: new URL(request.url),
      pattern: '/chat/:chatId',
    } as unknown as Parameters<typeof loader>[0]);

    expect(result.data).toMatchObject({ messages: undefined, messagesStatus: 500 });
  });
});
