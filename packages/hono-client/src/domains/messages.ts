import type { RawHonoClient } from '../core/raw-client'
import type {
  MessagesDeleteOutput,
  MessagesUpdateOutput,
} from '@hominem/hono-rpc/types/chat.types'

export interface MessagesDeleteInput {
  messageId: string
}

export interface MessagesUpdateInput {
  messageId: string
  content: string
}

export interface MessagesClient {
  delete(input: MessagesDeleteInput): Promise<MessagesDeleteOutput>
  update(input: MessagesUpdateInput): Promise<MessagesUpdateOutput>
}

export function createMessagesClient(rawClient: RawHonoClient): MessagesClient {
  return {
    async delete(input) {
      const res = await rawClient.api.messages[':messageId'].$delete({
        param: { messageId: input.messageId },
      })
      return res.json() as Promise<MessagesDeleteOutput>
    },
    async update(input) {
      const res = await rawClient.api.messages[':messageId'].$patch({
        param: { messageId: input.messageId },
        json: { content: input.content },
      })
      return res.json() as Promise<MessagesUpdateOutput>
    },
  }
}
