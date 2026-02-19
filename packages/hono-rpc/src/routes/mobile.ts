import { Hono } from 'hono'
import { generateObject } from 'ai'
import * as z from 'zod'
import { zValidator } from '@hono/zod-validator'

import { VoiceTranscriptionError, transcribeVoiceBuffer } from '@hominem/services'
import { authMiddleware, type AppContext } from '../middleware/auth'
import type {
  MobileIntentDeriveOutputV1,
  MobileIntentSuggestionsOutput,
  MobileDerivedTask,
  MobileVoiceTranscriptionErrorOutput,
  MobileVoiceTranscriptionOutput,
} from '../types/mobile.types'
import { getLMStudioAdapter } from '../utils/llm'

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

const deriveIntentSchema = z.object({
  content: z.string().min(1),
})

const derivedTaskSchema = z.object({
  text: z.string(),
  category: z.string().default('task'),
  due_date: z.string().nullable().default(null),
  priority: z.number().default(0),
  sentiment: z.string().default('neutral'),
  task_size: z.string().default('medium'),
  type: z.string().default('task'),
  state: z.enum(['backlog', 'active', 'completed', 'deleted']).default('active'),
})

const deriveOutputSchema = z.object({
  output: z.string(),
  create: z
    .object({
      output: z.array(derivedTaskSchema),
    })
    .optional(),
  search: z
    .object({
      input: z.object({
        keyword: z.string(),
      }),
      output: z.array(derivedTaskSchema),
    })
    .optional(),
  chat: z
    .object({
      output: z.string(),
    })
    .optional(),
  fallback_reason: z.string().optional(),
})

function toMobileDerivedTask(input: z.infer<typeof derivedTaskSchema>): MobileDerivedTask {
  const now = new Date().toISOString()
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: input.text,
    category: input.category,
    due_date: input.due_date,
    priority: input.priority,
    sentiment: input.sentiment,
    task_size: input.task_size,
    type: input.type,
    state: input.state,
    profile_id: '',
    created_at: now,
    updated_at: now,
  }
}

export const mobileRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/intents/suggestions', async (c) => {
    return c.json<MobileIntentSuggestionsOutput>({
      suggestions: DEFAULT_SUGGESTIONS,
    })
  })
  .post('/intents/derive', zValidator('json', deriveIntentSchema), async (c) => {
    const { content } = c.req.valid('json')

    const response = await generateObject<z.infer<typeof deriveOutputSchema>>({
      model: getLMStudioAdapter(),
      schema: deriveOutputSchema,
      prompt: `Extract user intent from this message and return structured output.\n\nMessage:\n${content}`,
    })

    const derived = response.object
    const payload: MobileIntentDeriveOutputV1 = {
      version: 'v1',
      output: derived.output,
      ...(derived.create
        ? {
            create: {
              output: derived.create.output.map((task: z.infer<typeof derivedTaskSchema>) =>
                toMobileDerivedTask(task),
              ),
            },
          }
        : {}),
      ...(derived.search
        ? {
            search: {
              input: derived.search.input,
              output: derived.search.output.map((task: z.infer<typeof derivedTaskSchema>) =>
                toMobileDerivedTask(task),
              ),
            },
          }
        : {}),
      ...(derived.chat ? { chat: derived.chat } : {}),
      ...(derived.fallback_reason ? { fallback_reason: derived.fallback_reason } : {}),
    }

    return c.json<MobileIntentDeriveOutputV1>(payload)
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
