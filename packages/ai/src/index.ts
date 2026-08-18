export { chat } from '@tanstack/ai';
export { openRouterText } from '@tanstack/ai-openrouter';
export {
  convertWebFetchToolToAdapterFormat,
  webFetchTool,
  webSearchTool,
} from '@tanstack/ai-openrouter/tools';

export {
  createOpenRouterClient,
  CHAT_MODEL,
  AUDIO_STT_MODEL,
  AUDIO_TTS_MODEL,
  EMBEDDING_MODEL,
  ENHANCE_MODEL,
  IMAGE_MODEL,
  JOB_EXTRACTION_MODEL,
  TASK_EXTRACTION_MODEL,
  TIME_BLOCK_EXTRACTION_MODEL,
  VOICE_CLEANUP_MODEL,
  isJsonObject,
  normalizeOpenRouterChatUsage,
  normalizeOpenRouterEmbeddingUsage,
  OpenRouterRequestError,
} from './shared';

export type {
  AIUsageMetrics,
  EmbeddingOptions,
  ImageGenerationOptions,
  JsonObject,
  OpenRouterClientLike,
  OpenRouterClientOptions,
  TranscriptionOptions,
} from './shared';

export type { ChatMessage as SharedChatMessage } from './text';

export {
  createChatCompletion,
  createOpenRouterTextAdapter,
  enhanceText,
  getChatCompletionText,
  getChatCompletionUsage,
  getSharedTextModel,
  getStructuredOutputUsage,
  postChatCompletion,
  streamChatCompletion,
  StructuredOutputError,
} from './text';

export type { OpenRouterTextAdapterOptions } from './text';

export { generateEmbedding } from './embeddings';
export { generateImageFromPrompt } from './image';
export { cleanupVoiceTranscript } from './voice-cleanup';

export type { VoiceTranscriptCleanupInput, VoiceTranscriptCleanupOutput } from './voice-cleanup';

export { synthesizeSpeech } from './speech';

export type { SynthesizeSpeechInput, SynthesizeSpeechResult } from './speech';

export { extractTasks, extractVoiceTasks } from './task-extraction';
export {
  extractTimeBlock,
  parseTimeBlockExtractionOutput,
  TimeBlockIntent,
} from './time-block-extraction';

export type {
  ExtractedTask,
  ExtractedVoiceTask,
  TaskExtractionInput,
  TaskExtractionOutput,
  VoiceTaskExtractionInput,
  VoiceTaskExtractionOutput,
} from './task-extraction';
export type {
  TimeBlock,
  TimeBlockExtractionInput,
  TimeBlockExtractionResult,
} from './time-block-extraction';

export {
  assertUnderMonthlyUsageLimit,
  getAIUsageFailureDetails,
  getMonthlyUsageStatus,
  MONTHLY_AI_USAGE_LIMIT_USD,
  recordAIUsageEvent,
  startAIUsageTimer,
} from './ai-usage';

export type { AIUsageFailureDetails, MonthlyUsageStatus } from './ai-usage';
