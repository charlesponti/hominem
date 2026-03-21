import type { RawHonoClient } from '../core/raw-client'
import type {
  Chat,
  ChatsCreateOutput,
  ChatsGetMessagesOutput,
  ChatsGetOutput,
  ChatsSendOutput,
  ChatsClassifyInput,
  ChatsClassifyOutput,
} from '../types/chat.types'

export interface ChatsCreateInput {
  title: string
  noteId?: string
}

export interface ChatsListInput {
  limit?: number
}

export interface ChatsGetMessagesInput {
  chatId: string
  limit?: number
  offset?: number
}

export interface ChatsGetByNoteInput {
  noteId: string
}

export interface ChatsSendMessageInput {
  chatId: string
  message: string
}

export interface ChatsArchiveInput {
  chatId: string
}

interface ArchiveRouteClient {
  api: {
    chats: {
      ':id': {
        messages: {
          $get(args: { param: { id: string }; query?: Record<string, string> }): Promise<{
            json(): Promise<ChatsGetMessagesOutput>
          }>
        }
        send: {
          $post(args: { param: { id: string }; json: { message: string } }): Promise<{
            json(): Promise<ChatsSendOutput>
          }>
        }
        classify: {
          $post(args: { param: { id: string }; json: { targetType: ChatsClassifyInput['targetType'] } }): Promise<{
            json(): Promise<ChatsClassifyOutput>
          }>
        }
        archive: {
          $post(args: { param: { id: string } }): Promise<{
            json(): Promise<Chat>
          }>
        }
      }
    }
  }
}

function toMessageQuery(input: ChatsGetMessagesInput): Record<string, string> {
  const query: Record<string, string> = {}

  if (typeof input.limit === 'number') {
    query.limit = String(input.limit)
  }
  if (typeof input.offset === 'number') {
    query.offset = String(input.offset)
  }

  return query
}

export interface ChatsGetInput {
  chatId: string
}

export interface ChatsClassifyClientInput extends ChatsClassifyInput {
  chatId: string
}

export interface ChatsDeleteInput {
  chatId: string
}

export interface ChatsClient {
  list(input: ChatsListInput): Promise<Chat[]>
  get(input: ChatsGetInput): Promise<ChatsGetOutput>
  getMessages(input: ChatsGetMessagesInput): Promise<ChatsGetMessagesOutput>
  getByNote(input: ChatsGetByNoteInput): Promise<Chat>
  create(input: ChatsCreateInput): Promise<ChatsCreateOutput>
  archive(input: ChatsArchiveInput): Promise<Chat>
  delete(input: ChatsDeleteInput): Promise<{ success: boolean }>
  send(input: ChatsSendMessageInput): Promise<ChatsSendOutput>
  classify(input: ChatsClassifyClientInput): Promise<ChatsClassifyOutput>
}

export function createChatsClient(rawClient: RawHonoClient): ChatsClient {
  const routeClient = rawClient as RawHonoClient & ArchiveRouteClient

  return {
    async list(input) {
      const query: Record<string, string> = {}
      if (typeof input.limit === 'number') {
        query.limit = String(input.limit)
      }
      const res = await rawClient.api.chats.$get({ query })
      return res.json() as Promise<Chat[]>
    },
    async get(input) {
      const res = await rawClient.api.chats[':id'].$get({
        param: { id: input.chatId },
      })
      return res.json() as Promise<ChatsGetOutput>
    },
    async getMessages(input) {
      const res = await routeClient.api.chats[':id'].messages.$get({
        param: { id: input.chatId },
        query: toMessageQuery(input),
      })
      return res.json() as Promise<ChatsGetMessagesOutput>
    },
    async getByNote(input) {
      const res = await rawClient.api.chats.note[':noteId'].$get({
        param: { noteId: input.noteId },
      })
      return res.json() as Promise<Chat>
    },
    async create(input) {
      const res = await rawClient.api.chats.$post({
        json: input,
      })
      return res.json() as Promise<ChatsCreateOutput>
    },
    async archive(input) {
      const res = await routeClient.api.chats[':id'].archive.$post({
        param: { id: input.chatId },
      })
      return res.json() as Promise<Chat>
    },
    async delete(input) {
      const res = await rawClient.api.chats[':id'].$delete({
        param: { id: input.chatId },
      })
      return res.json() as Promise<{ success: boolean }>
    },
    async send(input) {
      const res = await routeClient.api.chats[':id'].send.$post({
        param: { id: input.chatId },
        json: { message: input.message },
      })
      return res.json() as Promise<ChatsSendOutput>
    },
    async classify(input) {
      const res = await routeClient.api.chats[':id'].classify.$post({
        param: { id: input.chatId },
        json: { targetType: input.targetType },
      })
      return res.json() as Promise<ChatsClassifyOutput>
    },
  }
}
