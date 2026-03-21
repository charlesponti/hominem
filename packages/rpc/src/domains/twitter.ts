import type { RawHonoClient } from '../core/raw-client'
import type {
  TwitterAccountsListOutput,
  TwitterPostInput,
  TwitterPostOutput,
} from '../types/twitter.types'

export interface TwitterClient {
  getAccounts(): Promise<TwitterAccountsListOutput>
  post(input: TwitterPostInput): Promise<TwitterPostOutput>
}

export function createTwitterClient(rawClient: RawHonoClient): TwitterClient {
  return {
    async getAccounts() {
      const res = await rawClient.api.twitter.accounts.$get()
      return res.json() as Promise<TwitterAccountsListOutput>
    },
    async post(input) {
      const res = await rawClient.api.twitter.post.$post({ json: input })
      return res.json() as Promise<TwitterPostOutput>
    },
  }
}
