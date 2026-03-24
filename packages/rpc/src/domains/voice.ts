import type { RawHonoClient } from '../core/raw-client'

export interface VoiceSpeechInput {
  text: string
  voice?: string
  speed?: number
}

export interface VoiceClient {
  speech(input: VoiceSpeechInput): Promise<ArrayBuffer>
}

export function createVoiceClient(rawClient: RawHonoClient): VoiceClient {
  return {
    async speech(input: VoiceSpeechInput) {
      const res = await rawClient.api.voice.speech.$post({
        json: {
          text: input.text,
          voice: input.voice ?? 'alloy',
          speed: input.speed ?? 1,
        },
      })

      return res.arrayBuffer()
    },
  }
}
