import { Hono } from 'hono'

import { VoiceTranscriptionError, transcribeVoiceBuffer } from '@hominem/services'
import { authMiddleware, type AppContext } from '../middleware/auth'
import type {
  MobileIntentSuggestionsOutput,
  MobileVoiceTranscriptionErrorOutput,
  MobileVoiceTranscriptionOutput,
} from '../types/mobile.types'

const DEFAULT_SUGGESTIONS: MobileIntentSuggestionsOutput['suggestions'] = [
  {
    id: 'create_image',
    title: 'Create image',
    emoji: '🎨',
    seed_prompt: 'Create an illustration',
  },
  {
    id: 'help_me_learn',
    title: 'Help me learn',
    emoji: '📚',
    seed_prompt: 'Teach me something new',
  },
  {
    id: 'write_anything',
    title: 'Write anything',
    emoji: '📝',
    seed_prompt: 'Draft a concise note',
  },
  {
    id: 'boost_my_day',
    title: 'Boost my day',
    emoji: '✨',
    seed_prompt: 'Share a quick boost',
  },
]

export const mobileRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/intents/suggestions', async (c) => {
    return c.json<MobileIntentSuggestionsOutput>({
      suggestions: DEFAULT_SUGGESTIONS,
    })
  })
  .post('/voice/transcribe', async (c) => {
    try {
      const body = await c.req.parseBody()
      const input = body.audio

      const audioFile = Array.isArray(input) ? input[0] : input

      if (!(audioFile instanceof File)) {
        return c.json<MobileVoiceTranscriptionErrorOutput>(
          { error: 'No audio file provided', code: 'INVALID_FORMAT' },
          400,
        )
      }

      const output = await transcribeVoiceBuffer({
        buffer: await audioFile.arrayBuffer(),
        mimeType: audioFile.type,
        ...(audioFile.name ? { fileName: audioFile.name } : {}),
        language: 'en',
      })

      const response: MobileVoiceTranscriptionOutput = {
        text: output.text,
        ...(output.language ? { language: output.language } : {}),
        ...(typeof output.duration === 'number' ? { duration: output.duration } : {}),
        ...(output.words ? { words: output.words } : {}),
        ...(output.segments ? { segments: output.segments } : {}),
      }

      return c.json<MobileVoiceTranscriptionOutput>(response)
    } catch (error) {
      if (error instanceof VoiceTranscriptionError) {
        const statusCode =
          error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 429
            ? error.statusCode
            : 500
        return c.json<MobileVoiceTranscriptionErrorOutput>(
          { error: error.message, code: error.code },
          statusCode,
        )
      }

      return c.json<MobileVoiceTranscriptionErrorOutput>(
        { error: 'Failed to transcribe audio', code: 'TRANSCRIBE_FAILED' },
        500,
      )
    }
  })
