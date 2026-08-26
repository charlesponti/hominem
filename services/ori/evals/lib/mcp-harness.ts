import {
  AgentRuntimeEventTag,
  defineHarness,
  type AgentHarness,
  type AgentRuntimeEvent,
  type HarnessInvokeOptions,
} from 'ori';

type ToolCall = { id?: string; function?: { name?: string; arguments?: string } };

const tools = [
  {
    type: 'function',
    function: {
      name: 'calendar_search',
      description: 'Searches calendar events by title/description text, with optional date range.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' }, from: { type: 'string' }, to: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calendar_upcoming',
      description: 'Lists non-cancelled calendar events in a bounded window starting now.',
      parameters: { type: 'object', properties: { days: { type: 'integer' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'place_visit_history',
      description: 'Lists visits to restaurants, venues, and addresses.',
      parameters: { type: 'object', properties: { limit: { type: 'integer' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'trip_history',
      description: 'Lists past and upcoming trips, newest first, with attendee names.',
      parameters: {
        type: 'object',
        properties: { from: { type: 'string' }, to: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_career_portfolio',
      description: 'Retrieves my career portfolio including work history, skills, and roles.',
      parameters: { type: 'object', properties: {} },
    },
  },
] as const;

const toolResults: Record<string, unknown> = {
  calendar_search: { events: [], count: 0 },
  calendar_upcoming: { events: [], count: 0 },
  place_visit_history: { visits: [], count: 0 },
  trip_history: {
    trips: [
      { city: 'Tokyo', country: 'Japan', startDate: '2025-04-10', endDate: '2025-04-18' },
      { city: 'London', country: 'United Kingdom', startDate: '2024-09-02', endDate: '2024-09-08' },
    ],
    count: 2,
  },
  get_career_portfolio: {
    roles: [{ title: 'Staff Engineer', company: 'Hominem' }],
    skills: ['TypeScript', 'Product engineering'],
  },
};

type ToolDomain = 'calendar' | 'career' | 'travel' | 'general' | 'all';

const toolsByDomain: Record<Exclude<ToolDomain, 'all'>, readonly unknown[]> = {
  calendar: tools.slice(0, 2),
  career: [tools[4]],
  travel: [tools[2], tools[3]],
  general: [],
};

const parseDomain = (content: string): ToolDomain => {
  const match = content.match(
    /\{[\s\S]*?"domain"\s*:\s*"(calendar|career|travel|general|all)"[\s\S]*?\}/i,
  );
  return (match?.[1]?.toLowerCase() as ToolDomain | undefined) ?? 'all';
};

const routePrompt = async (prompt: string, model: string, apiKey: string): Promise<ToolDomain> => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Classify the request into exactly one domain: calendar, career, travel, general, or all. Return only JSON: {"domain":"..."}. Use all when uncertain or when multiple domains may be needed.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0,
    }),
  });
  if (!response.ok) return 'all';
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  return parseDomain(body.choices?.[0]?.message?.content ?? '');
};

const routerEnabled = (): boolean => process.env.ORI_MCP_ROUTER !== '0';

const event = (
  type: AgentRuntimeEventTag,
  payload: Record<string, unknown>,
  model: string | null | undefined,
): AgentRuntimeEvent => ({ type, payload, model, harness: 'hominem-mcp' }) as AgentRuntimeEvent;

const mcpHarness: AgentHarness = defineHarness({
  name: 'hominem-mcp',
  init(registrar) {
    registrar.registerPrompt(async function* (options: HarnessInvokeOptions) {
      const model = options.model ?? process.env.ORI_TARGET_MODEL ?? 'openai/gpt-4o-mini';
      const routerModel = process.env.ORI_MCP_ROUTER_MODEL?.trim() || model;
      const apiKey = options.env?.OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error('OPENROUTER_API_KEY is required for MCP evaluation');

      const routing = routerEnabled();
      const domain = routing
        ? await routePrompt(options.prompt, routerModel, apiKey).catch(() => 'all' as const)
        : 'all';
      const availableTools = domain === 'all' ? tools : toolsByDomain[domain];

      const messages: Array<Record<string, unknown>> = [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        { role: 'user', content: options.prompt },
      ];
      yield event(
        AgentRuntimeEventTag.RunStarted,
        {
          prompt: options.prompt,
          model,
          routerModel: routing ? routerModel : null,
          toolDomain: domain,
        },
        model,
      );
      yield event(AgentRuntimeEventTag.SessionStarted, {}, model);

      for (let turn = 0; turn < 3; turn += 1) {
        yield event(AgentRuntimeEventTag.TurnStarted, { prompt: options.prompt }, model);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0,
            ...(availableTools.length ? { tools: availableTools } : {}),
          }),
        });
        if (!response.ok) {
          const detail = await response.text();
          const message = `OpenRouter request failed (${response.status}): ${detail}`;
          yield event(AgentRuntimeEventTag.TurnFailed, { failure: { message } }, model);
          yield event(AgentRuntimeEventTag.SessionFailed, { failure: { message } }, model);
          throw new Error(message);
        }

        const body = (await response.json()) as {
          choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }>;
        };
        const message = body.choices?.[0]?.message;
        const toolCalls = message?.tool_calls ?? [];
        const content = message?.content ?? '';
        if (content) {
          yield event(AgentRuntimeEventTag.AssistantTextDelta, { delta: content }, model);
        }
        messages.push({
          role: 'assistant',
          content,
          ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
        });

        if (toolCalls.length === 0) {
          yield event(AgentRuntimeEventTag.TurnSucceeded, {}, model);
          yield event(AgentRuntimeEventTag.SessionSucceeded, {}, model);
          return;
        }

        for (const call of toolCalls) {
          const name = call.function?.name ?? 'unknown';
          const input = JSON.parse(call.function?.arguments ?? '{}') as Record<string, unknown>;
          const output = toolResults[name] ?? { error: `Unknown tool: ${name}` };
          yield event(
            AgentRuntimeEventTag.ToolStarted,
            { name, input, toolCallId: call.id },
            model,
          );
          yield event(
            AgentRuntimeEventTag.ToolSucceeded,
            { name, output, toolCallId: call.id },
            model,
          );
          messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(output) });
        }
        yield event(AgentRuntimeEventTag.TurnSucceeded, {}, model);
      }

      yield event(
        AgentRuntimeEventTag.SessionFailed,
        { failure: { message: 'The agent exceeded the allowed MCP interaction budget.' } },
        model,
      );
      throw new Error('The agent exceeded the allowed MCP interaction budget.');
    });
  },
});

export default mcpHarness;
