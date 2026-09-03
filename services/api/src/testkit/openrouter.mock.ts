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

type ScriptedContext = {
  request: OpenRouterRequest;
  toolNames: Set<string>;
  userText: string;
  hasToolResult: boolean;
  hasRejectedToolResult: boolean;
  hasFailedToolResult: boolean;
};

type ScriptedRule<T> = {
  matches: (context: ScriptedContext) => boolean;
  resolve: (context: ScriptedContext) => T;
};

let requestNumber = 0;
const failedProviderRequests = new Set<string>();
const CONTROLLED_DELAY_MS = 750;

function hasControl(userText: string, control: string) {
  return new RegExp(`\\b${control}\\b`, 'i').test(userText);
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function sse(value: unknown) {
  return `data: ${JSON.stringify(value)}\n\n`;
}

function firstMatchingRule<T>(rules: readonly ScriptedRule<T>[], context: ScriptedContext): T {
  const rule = rules.find((candidate) => candidate.matches(context));
  if (!rule) throw new Error('No scripted provider rule matched');
  return rule.resolve(context);
}

function createContext(request: OpenRouterRequest): ScriptedContext {
  const messages = request.messages ?? [];
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  return {
    request,
    toolNames: new Set(
      (request.tools ?? [])
        .map((tool) => tool.function?.name)
        .filter((name): name is string => Boolean(name)),
    ),
    hasToolResult: messages.some((message) => message.role === 'tool'),
    hasRejectedToolResult: messages.some(
      (message) => message.role === 'tool' && /rejected/i.test(String(message.content ?? '')),
    ),
    hasFailedToolResult: messages.some(
      (message) => message.role === 'tool' && /error/i.test(String(message.content ?? '')),
    ),
    userText: typeof latestUserMessage?.content === 'string' ? latestUserMessage.content : '',
  };
}

const toolNameRules: readonly ScriptedRule<string | null>[] = [
  {
    matches: ({ hasToolResult }) => hasToolResult,
    resolve: () => null,
  },
  {
    matches: ({ toolNames, userText }) =>
      toolNames.has('create_collection') &&
      /collection/i.test(userText) &&
      !/\b(list|show)\b/i.test(userText),
    resolve: () => 'create_collection',
  },
  {
    matches: ({ toolNames, userText }) =>
      toolNames.has('list_collections') && /list|show/i.test(userText),
    resolve: () => 'list_collections',
  },
  { matches: () => true, resolve: () => null },
];

const contentRules: readonly ScriptedRule<string>[] = [
  {
    matches: ({ hasRejectedToolResult }) => hasRejectedToolResult,
    resolve: () => 'The tool request was rejected.',
  },
  {
    matches: ({ hasFailedToolResult }) => hasFailedToolResult,
    resolve: () => 'The tool request failed.',
  },
  {
    matches: ({ hasToolResult, userText }) => hasToolResult && /TOOL-B006-READY/i.test(userText),
    resolve: () => 'TOOL-B006-READY',
  },
  {
    matches: ({ hasToolResult }) => hasToolResult,
    resolve: () => 'The collection was created successfully.',
  },
  {
    matches: ({ userText }) => /\b(reject|rejected|deny|denied)\b/i.test(userText),
    resolve: () => 'The tool request was rejected.',
  },
  {
    matches: () => true,
    resolve: ({ userText }) => `Scripted response: ${userText || 'Ready.'}`,
  },
];

function responseBody(request: OpenRouterRequest) {
  const context = createContext(request);
  const toolName = firstMatchingRule(toolNameRules, context);
  const shouldFailTool = /TOOL-B009-FAIL/i.test(context.userText);
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
  const content = firstMatchingRule(contentRules, context);
  const isStructured = request.response_format !== undefined;
  const responseContent = isStructured
    ? JSON.stringify({
        capabilities: ['collections'],
        requiresLookup: /collection/i.test(context.userText),
      })
    : content;
  const isInitialConfirmationRejection =
    /B008-OMIRO-CONFIRM-REJECT/i.test(context.userText) && !context.hasToolResult;
  const isRejectedRequest = /\b(reject|rejected|deny|denied)\b/i.test(context.userText);
  const delta =
    toolName && (!isRejectedRequest || isInitialConfirmationRejection)
      ? { tool_calls: [toolCall] }
      : { content };
  const payload = {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'hominem/scripted-chat',
    usage: {
      prompt_tokens: 1,
      completion_tokens: 1,
      total_tokens: 2,
      cost: 0,
    },
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
    // .clone() first: with OpenTelemetry's fetch/undici auto-instrumentation
    // active (as it is on a real server boot), the instrumentation reads the
    // request body for span capture before this handler runs, so a direct
    // request.json() throws "Body has already been read".
    const body = (await request.clone().json()) as OpenRouterRequest;
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
    const response = responseBody(body);
    const controlledStream =
      body.stream &&
      ['B012-STREAM', 'B013-DISCONNECT', 'B014-REPLAY', 'B017-ACTIVE-RELOAD'].some((control) =>
        hasControl(userText, control),
      );
    if (body.stream && hasControl(userText, 'B011-CANCEL-BEFORE')) {
      await wait(CONTROLLED_DELAY_MS * 12);
    }
    const frames = response
      .split('\n\n')
      .filter(Boolean)
      .map((frame) => `${frame}\n\n`);
    const frameDelayMs = ['B013-DISCONNECT', 'B014-REPLAY', 'B017-ACTIVE-RELOAD'].some((control) =>
      hasControl(userText, control),
    )
      ? CONTROLLED_DELAY_MS * 2
      : CONTROLLED_DELAY_MS;
    const encodedBody = new TextEncoder().encode(response);
    let frameIndex = 0;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (!controlledStream) {
          controller.enqueue(encodedBody);
          controller.close();
          return;
        }
        if (frameIndex >= frames.length) {
          controller.close();
          return;
        }
        if (frameIndex > 0) await wait(frameDelayMs);
        controller.enqueue(new TextEncoder().encode(frames[frameIndex++]));
      },
    });
    return new HttpResponse(stream, {
      headers: {
        'content-type': body.stream ? 'text/event-stream' : 'application/json',
      },
    });
  }),
);

export function installOpenRouterMock() {
  // Reset the failed provider requests set so that each test run starts fresh.
  failedProviderRequests.clear();

  // Telemetry still needs to reach the local collector while only OpenRouter
  // traffic is replaced by the scripted provider.
  server.listen({ onUnhandledRequest: 'bypass' });
  return () => server.close();
}
