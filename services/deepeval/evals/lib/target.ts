import { observe, updateCurrentSpan } from 'deepeval/tracing';

import '../vitest';
import {
  chatComplete,
  TARGET_MODEL,
  TARGET_REASONING,
  type ChatMessage,
  type ModelConfig,
} from './openrouter';

// This is the thing actually being evaluated - DeepEval handles all the eval logic itself.
export const runTarget = observe({
  type: 'llm',
  name: 'hominem_eval_target',
  model: TARGET_MODEL,
  fn: async (messages: ChatMessage[], config: Omit<ModelConfig, 'model'> = {}) => {
    const reply = await chatComplete(messages, {
      ...config,
      ...(TARGET_REASONING ? { reasoning: { effort: TARGET_REASONING, exclude: true } } : {}),
      model: TARGET_MODEL,
    });
    updateCurrentSpan({ input: messages, output: reply.content });
    return reply.content;
  },
});
