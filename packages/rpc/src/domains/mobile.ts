import type { RawHonoClient } from '../core/raw-client'
import type { MobileIntentSuggestionsOutput } from '../types/mobile.types'

export interface MobileSpeechInput {
  text: string;
  voice?: string;
  speed?: number;
}

export interface MobileClient {
  getIntentSuggestions(): Promise<MobileIntentSuggestionsOutput>
  speech(input: MobileSpeechInput): Promise<ArrayBuffer>
}

export function createMobileClient(rawClient: RawHonoClient): MobileClient {
  return {
    async getIntentSuggestions() {
      const res = await rawClient.api.mobile.intents.suggestions.$get()
      return res.json() as Promise<MobileIntentSuggestionsOutput>
    },
    async speech(input: MobileSpeechInput) {
      const res = await rawClient.api.mobile.voice.speech.$post({
        json: { text: input.text, voice: input.voice ?? 'alloy', speed: input.speed ?? 1 },
      })
      return res.arrayBuffer()
    },
  }
}
