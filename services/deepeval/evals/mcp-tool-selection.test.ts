import { describe, expect, it } from 'vitest';

import { CHAT_ASSISTANT_PROMPT } from '../../api/src/rpc/prompts';
import { chatComplete, type ModelConfig } from './lib/openrouter';

const MODEL: ModelConfig = {
  model: process.env.CHAT_MODEL ?? 'openai/gpt-4o-mini',
  temperature: 0,
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_career_portfolio',
        description: 'Retrieves my career portfolio including work history, skills, and roles',
        parameters: { type: 'object', properties: {} },
      },
    },
  ],
};

const CASES: Array<{ label: string; prompt: string; expectToolCall: boolean }> = [
  {
    label: 'explicit portfolio request',
    prompt: 'Look up my career portfolio and tell me what you find.',
    expectToolCall: true,
  },
  {
    label: 'unrelated weather question',
    prompt: "What's the weather like in London?",
    expectToolCall: false,
  },
  {
    label: 'paraphrased portfolio request',
    prompt: 'Can you pull up my work experience?',
    expectToolCall: true,
  },
  {
    label: 'explicit tool name is not required for a lookup',
    prompt: 'Use the career tool to show my work experience.',
    expectToolCall: true,
  },
  {
    label: 'unrelated small talk',
    prompt: 'Tell me about your favorite movie.',
    expectToolCall: false,
  },
];

describe('mcp-tool-selection', () => {
  it.each(CASES)('$label', async ({ prompt, expectToolCall }) => {
    const reply = await chatComplete(
      [
        { role: 'system', content: CHAT_ASSISTANT_PROMPT },
        { role: 'user', content: prompt },
      ],
      MODEL,
    );
    const calledTool = reply.toolCalls.some(
      (call) =>
        (call as { function?: { name?: string } }).function?.name === 'get_career_portfolio',
    );
    expect(calledTool).toBe(expectToolCall);
  });
});
