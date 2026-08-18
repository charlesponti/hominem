export { CHAT_MODEL, JOB_EXTRACTION_MODEL, OpenRouterRequestError } from './shared';

export type { AIUsageMetrics } from './shared';

export {
  createChatCompletion,
  enhanceText,
  getChatCompletionText,
  getChatCompletionUsage,
  getStructuredOutputUsage,
  streamChatCompletion,
  StructuredOutputError,
} from './text';

export { generateEmbedding } from './embeddings';
export { cleanupVoiceTranscript } from './voice-cleanup';

export type { VoiceTranscriptCleanupOutput } from './voice-cleanup';

export { synthesizeSpeech } from './speech';

export { extractTasks, extractVoiceTasks } from './task-extraction';
export { extractTimeBlock } from './time-block-extraction';

export {
  assertUnderMonthlyUsageLimit,
  getMonthlyUsageStatus,
  recordAIUsageEvent,
  startAIUsageTimer,
} from './ai-usage';
