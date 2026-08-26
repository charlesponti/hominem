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
      const apiKey = options.env?.OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error('OPENROUTER_API_KEY is required for MCP evaluation');

      const messages: Array<Record<string, unknown>> = [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        { role: 'user', content: options.prompt },
      ];
      yield event(AgentRuntimeEventTag.RunStarted, { prompt: options.prompt, model }, model);
      yield event(AgentRuntimeEventTag.SessionStarted, {}, model);

      for (let turn = 0; turn < 3; turn += 1) {
        yield event(AgentRuntimeEventTag.TurnStarted, { prompt: options.prompt }, model);
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model, messages, temperature: 0, tools }),
        });
        if (!response.ok) {
          const detail = await response.text();
          yield event(
            AgentRuntimeEventTag.TurnFailed,
            { failure: { message: `OpenRouter request failed (${response.status}): ${detail}` } },
            model,
          );
          yield event(AgentRuntimeEventTag.SessionFailed, { failure: { message: detail } }, model);
          return;
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
    });
  },
});

export default mcpHarness;
