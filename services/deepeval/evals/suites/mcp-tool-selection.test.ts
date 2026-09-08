import 'deepeval/vitest';
import { isObject } from '@hominem/utils';
import { EvaluationDataset, Golden } from 'deepeval/dataset';
import {
  StepEfficiencyMetric,
  TaskCompletionMetric,
  ToolCorrectnessMetric,
} from 'deepeval/metrics';
import { ToolCall } from 'deepeval/test-case';
import { observe, updateCurrentSpan, updateCurrentTrace } from 'deepeval/tracing';
import { describe, expect, it } from 'vitest';

import { CHAT_ASSISTANT_PROMPT } from '../../../api/src/rpc/prompts';
import goldens from '../../datasets/mcp-tool-selection/goldens.json';
import { judgeModel } from '../lib/judge';
import {
  chatComplete,
  TARGET_MODEL,
  TARGET_REASONING,
  type ChatMessage,
  type ChatReply,
  type ModelConfig,
} from '../lib/openrouter';

type FunctionToolCall = {
  id?: string;
  function?: { name?: string; arguments?: string };
};

const TOOL_DEFINITIONS: ModelConfig['tools'] = [
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
];

const TOOL_NAMES = TOOL_DEFINITIONS.map((tool) =>
  'function' in tool ? String(tool.function.name) : '',
).filter(Boolean);

const MODEL: ModelConfig = {
  model: TARGET_MODEL,
  temperature: 0,
  tools: TOOL_DEFINITIONS,
  ...(TARGET_REASONING ? { reasoning: { effort: TARGET_REASONING, exclude: true } } : {}),
};

const toolCorrectness = new ToolCorrectnessMetric({
  threshold: 1,
  shouldExactMatch: true,
  shouldConsiderOrdering: true,
  model: judgeModel,
});
const taskCompletion = new TaskCompletionMetric({ model: judgeModel, threshold: 0.7 });
const stepEfficiency = new StepEfficiencyMetric({ model: judgeModel, threshold: 0.7 });

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

function parseToolCalls(reply: ChatReply): FunctionToolCall[] {
  return reply.toolCalls.filter((call): call is FunctionToolCall => {
    if (!isObject(call)) return false;
    const candidate = call as FunctionToolCall;
    return typeof candidate.function?.name === 'string';
  });
}

function toToolCalls(calls: FunctionToolCall[]): ToolCall[] {
  return calls.map(
    (call) =>
      new ToolCall({
        name: call.function?.name ?? 'unknown',
      }),
  );
}

type TracedTurn = {
  reply: ChatReply;
  calls: FunctionToolCall[];
  toolOutputs: unknown[];
};

const tracedModelCall = observe({
  type: 'llm',
  name: 'mcp_model_decision',
  model: TARGET_MODEL,
  metrics: [toolCorrectness],
  fn: async (messages: ChatMessage[], expectedTools: ToolCall[]) => {
    const reply = await chatComplete(messages, MODEL);
    const calls = parseToolCalls(reply);
    const toolOutputs = [] as unknown[];
    for (const call of calls) toolOutputs.push(await executeTool(call));
    updateCurrentSpan({
      input: messages,
      output: reply.content,
      toolsCalled: toToolCalls(calls),
      expectedTools,
    });
    return { reply, calls, toolOutputs } satisfies TracedTurn;
  },
});

async function executeTool(call: FunctionToolCall): Promise<unknown> {
  const name = call.function?.name ?? 'unknown';
  const tracedTool = observe({
    type: 'tool',
    name,
    description: `Execute the ${name} MCP tool.`,
    fn: async () => toolResults[name] ?? { error: `Unknown tool: ${name}` },
  });
  return tracedTool();
}

const tracedAgent = observe({
  type: 'agent',
  name: 'hominem_mcp_chat_agent',
  availableTools: TOOL_NAMES,
  fn: async (input: string, expectedTools: ToolCall[], expectedOutput: string) => {
    const messages: ChatMessage[] = [
      { role: 'system', content: CHAT_ASSISTANT_PROMPT },
      { role: 'user', content: input },
    ];

    for (let iteration = 0; iteration < 3; iteration += 1) {
      const turn = await tracedModelCall(messages, iteration === 0 ? expectedTools : []);
      const { reply, calls } = turn;
      if (calls.length === 0) {
        updateCurrentTrace({ input, output: reply.content, expectedOutput });
        return reply.content;
      }

      messages.push({
        role: 'assistant',
        content: reply.content ?? '',
        toolCalls: reply.toolCalls,
      });
      for (const [index, call] of calls.entries()) {
        messages.push({
          role: 'tool',
          content: JSON.stringify(turn.toolOutputs[index]),
          toolCallId: call.id,
        });
      }
    }

    const output = 'The agent exceeded the allowed MCP interaction budget.';
    updateCurrentTrace({ input, output, expectedOutput });
    return output;
  },
});

const dataset = new EvaluationDataset({
  goldens: goldens.map(
    (golden) =>
      new Golden({
        ...golden,
        expectedTools: golden.expectedTools.map((tool) => new ToolCall(tool)),
      }),
  ),
});

describe('mcp-agent-native-traced', () => {
  for (const golden of dataset.goldens) {
    if (!(golden instanceof Golden)) throw new Error('MCP dataset must be single-turn');
    it(golden.name ?? golden.input, async () => {
      await expect(golden).toPass([taskCompletion, stepEfficiency], {
        task: (testCase) =>
          tracedAgent(
            testCase.input,
            testCase.expectedTools ?? [],
            testCase.expectedOutput ?? 'Complete the user request.',
          ),
      });
    });
  }
});
