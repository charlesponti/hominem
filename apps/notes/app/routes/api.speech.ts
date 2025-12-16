import { fileStorageService } from '@hominem/utils/supabase'
import type { ActionFunctionArgs } from 'react-router'
import { z } from 'zod'
import { openai } from '~/lib/services/openai.server.js'
import { requireAuth } from '~/lib/supabase/server.js'
import { jsonResponse } from '~/lib/utils/json-response'

// Zod schema for speech request validation
const speechRequestSchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(4096, 'Text too long. Maximum length is 4096 characters.'),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
  speed: z
    .number()
    .min(0.25, 'Speed must be at least 0.25')
    .max(4.0, 'Speed must be at most 4.0')
    .default(1.0),
})

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    // Require authentication and get user
    const { user } = await requireAuth(request)
    const userId = user.id

    // Parse and validate request body
    const body = await request.json()
    const validationResult = speechRequestSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((issue) => issue.message).join(', ')
      return jsonResponse({ error: `Validation failed: ${errors}` }, { status: 400 })
    }

    const { text, voice, speed } = validationResult.data

    // Generate speech using OpenAI TTS
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      response_format: 'mp3',
      speed: speed,
    })

    // Convert response to buffer
    const buffer = Buffer.from(await mp3Response.arrayBuffer())

    // Store the audio file using Supabase storage
    const fileName = `speech-${Date.now()}-${voice}-${speed}.mp3`
    const storedFile = await fileStorageService.storeFile(buffer, fileName, 'audio/mpeg', userId)

    return jsonResponse({
      success: true,
      audio: {
        fileId: storedFile.id,
        fileName: storedFile.filename,
        url: storedFile.url,
        size: storedFile.size,
        duration: estimateAudioDuration(text),
        voice,
        speed,
      },
    })
  } catch (error) {
    console.error('Text-to-speech error:', error)

    let errorMessage = 'Failed to generate speech'
    let statusCode = 500

    if (error instanceof Error) {
      // Handle specific OpenAI errors
      if (error.message.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later.'
        statusCode = 429
      } else if (error.message.includes('API key')) {
        errorMessage = 'Invalid API configuration.'
        statusCode = 401
      } else if (error.message.includes('content_policy')) {
        errorMessage = 'Text content not allowed by content policy.'
        statusCode = 400
      } else {
        errorMessage = `Speech generation failed: ${error.message}`
      }
    }

    return jsonResponse(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    )
  }
}

// Rough estimation of audio duration based on text length
// Average speaking rate is about 150-160 words per minute
function estimateAudioDuration(text: string) {
  const words = text.split(/\s+/).length
  const wordsPerMinute = 150
  const durationMinutes = words / wordsPerMinute
  return Math.ceil(durationMinutes * 60) // Return seconds
}
