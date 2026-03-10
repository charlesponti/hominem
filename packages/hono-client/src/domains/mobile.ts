import type { RawHonoClient } from '../core/raw-client'
import type { MobileIntentSuggestionsOutput } from '@hominem/hono-rpc/types/mobile.types'

export interface MobileClient {
  getIntentSuggestions(): Promise<MobileIntentSuggestionsOutput>
}

export function createMobileClient(rawClient: RawHonoClient): MobileClient {
  return {
    async getIntentSuggestions() {
      const res = await rawClient.api.mobile.intents.suggestions.$get()
      return res.json() as Promise<MobileIntentSuggestionsOutput>
    },
  }
}
