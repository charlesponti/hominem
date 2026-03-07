import type { LanguageModelV1 } from 'ai';

import { openai } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * Create LM Studio adapter
 * Uses OpenAI-compatible API endpoint
 */
export function getLMStudioAdapter(): LanguageModelV1 {
  const lmstudio = createOpenAICompatible({
    name: 'lmstudio',
    baseURL: 'http://localhost:1234/v1',
  });
  return lmstudio('gpt-4.1');
}

/**
 * Create OpenAI adapter
 */
export function getOpenAIAdapter(): LanguageModelV1 {
  return openai('gpt-4o');
}
