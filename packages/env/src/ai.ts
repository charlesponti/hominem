import { z } from 'zod';

export const aiSchema = z.object({
  OPENROUTER_API_KEY: z.string().optional(),
  AUDIO_TTS_MODEL: z.string().default('microsoft/mai-voice-2-flash'),
  AUDIO_TTS_VOICE: z.string().default('en-US-Harper:MAI-Voice-2'),
  CHAT_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
  EMBEDDING_MODEL: z.string().default('google/gemini-embedding-2'),
  ENHANCE_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
  JOB_EXTRACTION_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
  TASK_EXTRACTION_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
  TIME_BLOCK_EXTRACTION_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
  VOICE_CLEANUP_MODEL: z.string().default('google/gemini-2.5-flash-lite'),
});

export type AiEnv = z.infer<typeof aiSchema>;
