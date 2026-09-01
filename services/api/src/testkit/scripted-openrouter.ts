import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

type OpenRouterMessage = {
  role?: string;
  content?: unknown;
};

type OpenRouterRequest = {
  messages?: OpenRouterMessage[];
  response_format?: unknown;
  stream?: boolean;
  tools?: Array<{ function?: { name?: string } }>;
};

let requestNumber = 0;

function sse(value: unknown) {
  return `data: ${JSON.stringify(value)}\n\n`;
}

function responseBody(request: OpenRouterRequest) {
  const messages = request.messages ?? [];
  const toolNames = new Set(
    (request.tools ?? [])
      .map((tool) => tool.function?.name)
      .filter((name): name is string => Boolean(name)),
  );
  const hasToolResult = messages.some((message) => message.role === 'tool');
  const userText = messages
    .filter((message) => message.role === 'user')
    .map((message) => (typeof message.content === 'string' ? message.content : ''))
    .join('\n');
  const shouldCreateCollection =
    !hasToolResult && toolNames.has('create_collection') && /collection/i.test(userText);
  const id = `scripted-${++requestNumber}`;
  const toolCall = {
    index: 0,
    id: `scripted-call-${requestNumber}`,
    type: 'function',
    function: {
      name: 'create_collection',
      arguments: JSON.stringify({
        description: 'Created by the local scripted provider',
        name: 'Browser scripted provider collection',
        visibility: 'private',
      }),
    },
  };
  const content = hasToolResult
    ? 'The collection was created successfully.'
    : `Scripted response: ${userText || 'Ready.'}`;
  const isStructured = request.response_format !== undefined;
  const responseContent = isStructured
    ? JSON.stringify({
        capabilities: ['collections'],
        requiresLookup: /collection/i.test(userText),
      })
    : content;
  const delta = shouldCreateCollection ? { tool_calls: [toolCall] } : { content };
  const payload = {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'hominem/scripted-chat',
    choices: [{ index: 0, delta, finish_reason: null }],
  };

  if (!request.stream) {
    return JSON.stringify({
      ...payload,
      object: 'chat.completion',
      system_fingerprint: null,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            ...(isStructured ? { content: responseContent } : delta),
          },
          finish_reason: 'stop',
        },
      ],
    });
  }

  return `${sse(payload)}${sse({
    ...payload,
    choices: [{ ...payload.choices[0], delta: {}, finish_reason: 'stop' }],
  })}data: [DONE]\n\n`;
}

const server = setupServer(
  http.post('https://openrouter.ai/api/v1/chat/completions', async ({ request }) => {
    const body = (await request.json()) as OpenRouterRequest;
    const encodedBody = new TextEncoder().encode(responseBody(body));
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encodedBody);
        controller.close();
      },
    });
    return new HttpResponse(stream, {
      headers: {
        'content-type': body.stream ? 'text/event-stream' : 'application/json',
      },
    });
  }),
);

export function installScriptedOpenRouter() {
  // Telemetry still needs to reach the local collector while only OpenRouter
  // traffic is replaced by the scripted provider.
  server.listen({ onUnhandledRequest: 'bypass' });
  return () => server.close();
}
