import type { ActionFunctionArgs } from 'react-router'
import { openai } from '~/lib/services/openai.server.js'
import { withRateLimit } from '~/lib/services/rate-limit.server.js'
import { jsonResponse } from '~/lib/utils/json-response'

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  return withRateLimit('transcription')(request, async () => {
    try {
      const formData = await request.formData()
      const audioFile = formData.get('audio') as File

      if (!audioFile) {
        return jsonResponse({ error: 'No audio file provided' }, { status: 400 })
      }

      // Validate file type
      const validTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']
      if (!validTypes.includes(audioFile.type)) {
        return jsonResponse(
          {
            error: `Unsupported audio format: ${audioFile.type}. Supported formats: ${validTypes.join(', ')}`,
          },
          { status: 400 }
        )
      }

      // Check file size (25MB OpenAI limit)
      const maxSize = 25 * 1024 * 1024 // 25MB
      if (audioFile.size > maxSize) {
        return jsonResponse(
          {
            error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`,
          },
          { status: 400 }
        )
      }

      // Generate hash for caching
      const audioBuffer = await audioFile.arrayBuffer()
      const fileExtension = getFileExtension(audioFile.type)
      const fileName = `audio${fileExtension}`

      // Convert to File with proper name
      const processedFile = new File([audioBuffer], fileName, { type: audioFile.type })

      // Transcribe using OpenAI Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: processedFile,
        model: 'whisper-1',
        language: 'en', // Can be made configurable
        response_format: 'verbose_json', // Get detailed response with timestamps
        timestamp_granularities: ['word'],
      })

      return jsonResponse({
        success: true,
        transcription: {
          text: transcription.text,
          language: transcription.language,
          duration: transcription.duration,
          words: transcription.words || [],
          segments: transcription.segments || [],
        },
      })
    } catch (error) {
      console.error('Transcription error:', error)

      let errorMessage = 'Failed to transcribe audio'
      let statusCode = 500

      if (error instanceof Error) {
        // Handle specific OpenAI errors
        if (error.message.includes('Invalid file format')) {
          errorMessage = 'Invalid audio file format. Please use WAV, MP3, MP4, or WebM.'
          statusCode = 400
        } else if (error.message.includes('File too large')) {
          errorMessage = 'Audio file is too large. Maximum size is 25MB.'
          statusCode = 400
        } else if (error.message.includes('quota')) {
          errorMessage = 'API quota exceeded. Please try again later.'
          statusCode = 429
        } else if (error.message.includes('API key')) {
          errorMessage = 'Invalid API configuration.'
          statusCode = 401
        } else {
          errorMessage = `Transcription failed: ${error.message}`
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

function getFileExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'audio/webm': '.webm',
    'audio/mp4': '.mp4',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
  }
  return mimeToExt[mimeType] || '.webm'
}
