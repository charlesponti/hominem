import { experimental_generateSpeech } from 'ai'
import { openai } from '@ai-sdk/openai'
import { Buffer } from 'node:buffer'

import { env } from './env'

export class VoiceSpeechError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 500) {
    super(message)
    this.name = 'VoiceSpeechError'
    this.statusCode = statusCode
  }
}

export async function generateSpeechBuffer(input: {
  text: string
  voice: string
  speed: number
}) {
  if (!env.OPENAI_API_KEY) {
    throw new VoiceSpeechError('Invalid API configuration.', 401)
  }

  try {
    const speech = await experimental_generateSpeech({
      model: openai.speech('tts-1'),
      text: input.text,
      voice: input.voice,
      outputFormat: 'mp3',
      speed: input.speed,
    })

    return {
      audioBuffer: Buffer.from(speech.audio.base64, 'base64'),
      mediaType: speech.audio.mimeType,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        throw new VoiceSpeechError('API quota exceeded. Please try again later.', 429)
      }
      if (error.message.includes('API key')) {
        throw new VoiceSpeechError('Invalid API configuration.', 401)
      }
      if (error.message.includes('content_policy')) {
        throw new VoiceSpeechError('Text content not allowed by content policy.', 400)
      }
      throw new VoiceSpeechError(`Speech generation failed: ${error.message}`, 500)
    }

    throw new VoiceSpeechError('Failed to generate speech', 500)
  }
}
