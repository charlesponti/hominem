export {
  AUDIO_TTS_MODEL,
  AUDIO_TTS_VOICE,
  CHAT_MODEL,
  JOB_EXTRACTION_MODEL,
  OpenRouterRequestError,
} from './shared';

export type { AIUsageMetrics } from './shared';

export { convertSchemaToJsonSchema } from '@tanstack/ai';

export type {
  ChatFunctionTool,
  ChatToolCall,
  ChatMessages,
  ChatRequest,
  ChatStreamChunk,
  ChatStreamToolCall,
} from '@openrouter/sdk/models';

export {
  createChatCompletion,
  createStructuredChatCompletion,
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
export { getSpeechUsageEstimate } from './speech';
export type {
  SpeechGenerationUsage,
  SpeechUsageEstimate,
  SynthesizeSpeechStreamResult,
} from './speech';

export { extractTasks, extractVoiceTasks } from './task-extraction';
export { extractTimeBlock } from './time-block-extraction';

export {
  assertUnderMonthlyUsageLimit,
  getMonthlyAIUsageReport,
  getAIUsageTimeseries,
  getMonthlyUsageStatus,
  recordAIUsageEvent,
  startAIUsageTimer,
} from './ai-usage';

export type { AIUsageTimeseriesReport, MonthlyAIUsageReport, MonthlyUsageStatus } from './ai-usage';
