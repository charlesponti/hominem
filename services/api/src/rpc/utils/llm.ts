import { getSharedTextModel } from '@hominem/services/ai-model';
import type { LanguageModelV1 } from 'ai';

/**
 * Create shared text-generation adapter
 */
export function getOpenAIAdapter(): LanguageModelV1 {
  return getSharedTextModel();
}
