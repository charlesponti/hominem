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
const failedProviderRequests = new Set<string>();

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
  const hasRejectedToolResult = messages.some(
    (message) => message.role === 'tool' && /rejected/i.test(String(message.content ?? '')),
  );
  const hasFailedToolResult = messages.some(
    (message) => message.role === 'tool' && /error/i.test(String(message.content ?? '')),
  );
  const userText = messages
    .filter((message) => message.role === 'user')
    .map((message) => (typeof message.content === 'string' ? message.content : ''))
    .join('\n');
  const shouldAcknowledgeRejection = /\b(reject|rejected|deny|denied)\b/i.test(userText);
  const shouldFailTool = /TOOL-B009-FAIL/i.test(userText);
  const shouldCreateCollection =
    !hasToolResult &&
    toolNames.has('create_collection') &&
    /collection/i.test(userText) &&
    !/\b(list|show)\b/i.test(userText);
  const shouldListCollections =
    !hasToolResult && toolNames.has('list_collections') && /list|show/i.test(userText);
  const toolName = shouldCreateCollection
    ? 'create_collection'
    : shouldListCollections
      ? 'list_collections'
      : null;
  const id = `scripted-${++requestNumber}`;
  const toolCall = {
    index: 0,
    id: `scripted-call-${requestNumber}`,
    type: 'function',
    function: {
      name: toolName ?? 'create_collection',
      arguments: shouldFailTool
        ? '{invalid'
        : toolName === 'list_collections'
          ? '{}'
          : JSON.stringify({
              description: 'Created by the local scripted provider',
              name: 'Browser scripted provider collection',
              visibility: 'private',
            }),
    },
  };
  const content = hasRejectedToolResult
    ? 'The tool request was rejected.'
    : hasFailedToolResult
      ? 'The tool request failed.'
      : hasToolResult
        ? /TOOL-B006-READY/i.test(userText)
          ? 'TOOL-B006-READY'
          : 'The collection was created successfully.'
        : shouldAcknowledgeRejection
          ? 'The tool request was rejected.'
          : `Scripted response: ${userText || 'Ready.'}`;
  const isStructured = request.response_format !== undefined;
  const responseContent = isStructured
    ? JSON.stringify({
        capabilities: ['collections'],
        requiresLookup: /collection/i.test(userText),
      })
    : content;
  const delta = toolName && !shouldAcknowledgeRejection ? { tool_calls: [toolCall] } : { content };
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
    const userText = (body.messages ?? [])
      .filter((message) => message.role === 'user')
      .map((message) => (typeof message.content === 'string' ? message.content : ''))
      .join('\n');
    const failureMarker = userText.match(/PROVIDER-B010-FAIL(?:-[A-Z0-9]+)?/i)?.[0].toUpperCase();
    if (!body.response_format && failureMarker && !failedProviderRequests.has(failureMarker)) {
      failedProviderRequests.add(failureMarker);
      return HttpResponse.json(
        { error: { code: 400, message: 'Scripted provider failure' } },
        { status: 400 },
      );
    }
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
  // Reset the failed provider requests set so that each test run starts fresh.
  failedProviderRequests.clear();

  // Telemetry still needs to reach the local collector while only OpenRouter
  // traffic is replaced by the scripted provider.
  server.listen({ onUnhandledRequest: 'bypass' });
  return () => server.close();
}
