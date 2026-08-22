export {
  AUDIO_TTS_MODEL,
  CHAT_MODEL,
  JOB_EXTRACTION_MODEL,
  OpenRouterRequestError,
} from './shared';

export type { AIUsageMetrics } from './shared';

export { convertSchemaToJsonSchema } from '@tanstack/ai';

export type {
  ChatFunctionTool,
  ChatMessages,
  ChatRequest,
  ChatStreamToolCall,
} from '@openrouter/sdk/models';

export {
  createChatCompletion,
  enhanceText,
  generateNoteFromChat,
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
export { synthesizeSpeechStream } from './speech';
export { getSpeechGenerationUsage } from './speech';
export type { SpeechGenerationUsage, SynthesizeSpeechStreamResult } from './speech';

export { extractTasks, extractVoiceTasks } from './task-extraction';
export { extractTimeBlock } from './time-block-extraction';

export {
  assertUnderMonthlyUsageLimit,
  getMonthlyAIUsageReport,
  getMonthlyUsageStatus,
  recordAIUsageEvent,
  startAIUsageTimer,
} from './ai-usage';

export type { MonthlyAIUsageReport, MonthlyUsageStatus } from './ai-usage';
