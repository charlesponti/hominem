export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type ChatMessageRole = 'system' | 'user' | 'assistant' | 'tool'

export interface ChatMessageToolCall {
  toolName: string
  type: 'tool-call'
  toolCallId: string
  args: Record<string, string>
}

export interface ChatMessageFile {
  type: 'image' | 'file'
  filename?: string
  mimeType?: string
  size?: number
  metadata?: Record<string, JsonValue>
}

export interface Chat {
  id: string
  userId: string
  title: string
  noteId: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatInsert {
  id?: string
  userId: string
  title?: string
  noteId?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ChatMessage {
  id: string
  chatId: string
  userId: string
  role: ChatMessageRole
  content: string
  files: ChatMessageFile[] | null
  toolCalls: ChatMessageToolCall[] | null
  reasoning: string | null
  parentMessageId: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessageInsert {
  id?: string
  chatId: string
  userId: string
  role: ChatMessageRole
  content: string
  files?: ChatMessageFile[] | null
  toolCalls?: ChatMessageToolCall[] | null
  reasoning?: string | null
  parentMessageId?: string | null
  createdAt?: string
  updatedAt?: string
}

export type ChatOutput = Chat
export type ChatInput = ChatInsert
export type ChatMessageOutput = ChatMessage
export type ChatMessageInput = ChatMessageInsert
