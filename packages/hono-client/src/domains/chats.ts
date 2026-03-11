import type { RawHonoClient } from '../core/raw-client'
import type {
  Chat,
  ChatsCreateOutput,
  ChatsGetMessagesOutput,
  ChatsGetOutput,
  ChatsSendOutput,
} from '@hominem/hono-rpc/types/chat.types'

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

export interface ChatsClient {
  list(input: ChatsListInput): Promise<Chat[]>
  get(input: ChatsGetInput): Promise<ChatsGetOutput>
  getMessages(input: ChatsGetMessagesInput): Promise<ChatsGetMessagesOutput>
  getByNote(input: ChatsGetByNoteInput): Promise<Chat>
  create(input: ChatsCreateInput): Promise<ChatsCreateOutput>
  send(input: ChatsSendMessageInput): Promise<ChatsSendOutput>
}

export function createChatsClient(rawClient: RawHonoClient): ChatsClient {
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
      const res = await rawClient.api.chats[':id'].messages.$get({
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
    async send(input) {
      const res = await rawClient.api.chats[':id'].send.$post({
        param: { id: input.chatId },
        json: { message: input.message },
      })
      return res.json() as Promise<ChatsSendOutput>
    },
  }
}
