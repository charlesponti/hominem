import { observe, updateCurrentSpan } from 'deepeval/tracing';

import '../vitest';
import {
  chatComplete,
  DEFAULT_TARGET_MODEL,
  type ChatMessage,
  type ModelConfig,
} from './openrouter';

/** The application boundary under evaluation; DeepEval owns all evaluation logic. */
export const runTarget = observe({
  type: 'llm',
  name: 'hominem_eval_target',
  model: DEFAULT_TARGET_MODEL,
  fn: async (messages: ChatMessage[], config: Omit<ModelConfig, 'model'> = {}) => {
    const reply = await chatComplete(messages, { ...config, model: DEFAULT_TARGET_MODEL });
    updateCurrentSpan({ input: messages, output: reply.content });
    return reply.content;
  },
});
