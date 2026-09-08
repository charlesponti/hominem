export {
  AUDIO_TTS_MODEL,
  AUDIO_TTS_VOICE,
  CHAT_MODEL,
  ENHANCE_MODEL,
  JOB_EXTRACTION_MODEL,
  normalizeOpenRouterError,
  OpenRouterRequestError,
  TASK_EXTRACTION_MODEL,
  TIME_BLOCK_EXTRACTION_MODEL,
  VOICE_CLEANUP_MODEL,
} from './shared';

export type { AIUsageMetrics, OpenRouterClientOptions } from './shared';

export { convertZodToJsonSchema as convertSchemaToJsonSchema } from '@openrouter/sdk/lib/tool-executor';

export type {
  ChatFunctionTool,
  ChatMessages,
  ChatRequest,
  ChatResult,
  ChatStreamChunk,
  ChatStreamToolCall,
  ChatToolCall,
  ChatUsage,
} from '@openrouter/sdk/models';

export {
  createChatCompletion,
  createStructuredChatCompletion,
  getChatCompletionText,
  getChatCompletionUsage,
  getStructuredOutputUsage,
  streamChatCompletion,
  StructuredOutputError,
} from './text';

export { generateEmbedding } from './embeddings';

export {
  getSpeechGenerationUsage,
  getSpeechUsageEstimate,
  synthesizeSpeech,
  synthesizeSpeechStream,
} from './speech';
export type {
  SpeechGenerationUsage,
  SpeechUsageEstimate,
  SynthesizeSpeechStreamResult,
} from './speech';

export {
  assertUnderMonthlyUsageLimit,
  getAIUsageTimeseries,
  getMonthlyAIUsageReport,
  getMonthlyUsageStatus,
  recordAIUsageEvent,
  startAIUsageTimer,
} from './ai-usage';

export type { AIUsageTimeseriesReport, MonthlyAIUsageReport, MonthlyUsageStatus } from './ai-usage';
