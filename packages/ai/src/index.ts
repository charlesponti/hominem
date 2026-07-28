export { chat } from '@tanstack/ai';
export { openRouterText } from '@tanstack/ai-openrouter';
export {
  convertWebFetchToolToAdapterFormat,
  webFetchTool,
  webSearchTool,
} from '@tanstack/ai-openrouter/tools';

export {
  createOpenRouterClient,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_IMAGE_MODEL,
  DEFAULT_SPEECH_MODEL,
  DEFAULT_TASK_EXTRACTION_MODEL,
  DEFAULT_TEXT_MODEL,
  DEFAULT_TRANSCRIPTION_MODEL,
  DEFAULT_TTS_MODEL,
  DEFAULT_VOICE_CLEANUP_MODEL,
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
  getSharedAiModelConfig,
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
