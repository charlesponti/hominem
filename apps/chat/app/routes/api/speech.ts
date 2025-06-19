import type { ActionFunctionArgs } from 'react-router'
import { TTSCache } from '~/lib/services/cache.server.js'
import { storeFile } from '~/lib/services/file-storage.server.js'
import { openai } from '~/lib/services/openai.server.js'
import { withRateLimit } from '~/lib/services/rate-limit.server.js'
import { jsonResponse } from '~/lib/utils/json-response'

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  return withRateLimit('tts')(request, async () => {
    try {
      const { text, voice = 'alloy', speed = 1.0 } = await request.json()

      if (!text || typeof text !== 'string') {
        return jsonResponse({ error: 'Text is required' }, { status: 400 })
      }

      // Validate text length (OpenAI has a 4096 character limit)
      if (text.length > 4096) {
        return jsonResponse(
          {
            error: 'Text too long. Maximum length is 4096 characters.',
          },
          { status: 400 }
        )
      }

      // Validate voice option
      const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
      if (!validVoices.includes(voice)) {
        return jsonResponse(
          {
            error: `Invalid voice. Valid options: ${validVoices.join(', ')}`,
          },
          { status: 400 }
        )
      }

      // Validate speed
      if (speed < 0.25 || speed > 4.0) {
        return jsonResponse(
          {
            error: 'Speed must be between 0.25 and 4.0',
          },
          { status: 400 }
        )
      }

      // Try to get from cache first, or generate new TTS
      const result = await TTSCache.getOrCreate(text, voice, speed, async () => {
        // Generate speech using OpenAI TTS
        const mp3Response = await openai.audio.speech.create({
          model: 'tts-1', // or 'tts-1-hd' for higher quality
          voice: voice as any,
          input: text,
          response_format: 'mp3',
          speed: speed,
        })

        // Convert response to buffer
        const buffer = Buffer.from(await mp3Response.arrayBuffer())

        // Store the audio file
        const fileName = `speech-${Date.now()}-${voice}-${speed}.mp3`
        const storedFile = await storeFile(buffer, fileName, 'audio/mpeg')

        return {
          fileId: storedFile.id,
          fileName: storedFile.filename,
          url: `/api/files/${storedFile.id}`,
          size: storedFile.size,
          duration: estimateAudioDuration(text),
          voice,
          speed,
        }
      })

      return jsonResponse({
        success: true,
        audio: result,
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
  })
}

// Rough estimation of audio duration based on text length
// Average speaking rate is about 150-160 words per minute
function estimateAudioDuration(text: string): number {
  const words = text.split(/\s+/).length
  const wordsPerMinute = 150
  const durationMinutes = words / wordsPerMinute
  return Math.ceil(durationMinutes * 60) // Return seconds
}
