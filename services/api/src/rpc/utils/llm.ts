import type { LanguageModelV1 } from 'ai';

import { getSharedTextModel } from '@hominem/services/ai-model';

/**
 * Create shared text-generation adapter
 */
export function getOpenAIAdapter(): LanguageModelV1 {
  return getSharedTextModel();
}
