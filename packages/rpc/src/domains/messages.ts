import type { RawHonoClient } from '../core/raw-client'
import type {
  MessagesDeleteOutput,
  MessagesUpdateOutput,
} from '../types/chat.types'

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

interface MessageUpdateRouteClient {
  api: {
    messages: {
      ':messageId': {
        $patch(args: { param: { messageId: string }; json: { content: string } }): Promise<{
          json(): Promise<MessagesUpdateOutput>
        }>
      }
    }
  }
}

export function createMessagesClient(rawClient: RawHonoClient): MessagesClient {
  const routeClient = rawClient as RawHonoClient & MessageUpdateRouteClient

  return {
    async delete(input) {
      const res = await rawClient.api.messages[':messageId'].$delete({
        param: { messageId: input.messageId },
      })
      return res.json() as Promise<MessagesDeleteOutput>
    },
    async update(input) {
      const res = await routeClient.api.messages[':messageId'].$patch({
        param: { messageId: input.messageId },
        json: { content: input.content },
      })
      return res.json() as Promise<MessagesUpdateOutput>
    },
  }
}
