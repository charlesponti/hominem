import * as z from 'zod'

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
  fileId?: string
  url?: string
  filename?: string
  mimeType?: string
  size?: number
  metadata?: Record<string, JsonValue>
}

export interface Chat {
  archivedAt: string | null
  id: string
  userId: string
  title: string
  noteId: string | null
  createdAt: string
  updatedAt: string
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

export type ChatWithMessages = Chat & {
  messages: ChatMessage[];
};

// ============================================================================
// SEND MESSAGE
// ============================================================================

export type ChatsSendInput = {
  message: string;
  fileIds?: string[];
  chatId?: string;
};

export type ChatUIMessageInput = {
  id: string
  role: 'system' | 'user' | 'assistant' | 'data'
  content: string
  parts?: Array<Record<string, unknown>>
  toolInvocations?: Array<Record<string, unknown>>
  createdAt?: string | Date
}

export type ChatsUISendInput = {
  messages: ChatUIMessageInput[]
  chatId?: string
  metadata?: Record<string, unknown>
}

export const chatsSendSchema = z.object({
  message: z.string(),
  fileIds: z.array(z.string().uuid()).max(5).optional(),
  chatId: z.string().optional(),
}).superRefine((value, ctx) => {
  if (value.message.trim().length === 0 && (!value.fileIds || value.fileIds.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'message or fileIds is required',
      path: ['message'],
    })
  }
})

export const chatsUISendSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['system', 'user', 'assistant', 'data']),
      content: z.string(),
      parts: z.array(z.record(z.string(), z.unknown())).optional(),
      toolInvocations: z.array(z.record(z.string(), z.unknown())).optional(),
      createdAt: z.union([z.string(), z.date()]).optional(),
    }),
  ),
  chatId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type ChatsSendOutput = {
  streamId: string;
  chatId: string;
  chatTitle: string;
  messages: {
    user: ChatMessage;
    assistant: ChatMessage;
  };
  metadata: {
    startTime: number;
    timestamp: string;
  };
};

export type ChatsCreateInput = {
  title: string;
};

export type ChatsArchiveOutput = Chat;

// ============================================================================
// Output Types (Inferred from returns - these are optional aliases)
// ============================================================================

export type ChatsListOutput = Chat[];
export type ChatsGetOutput = ChatWithMessages;
export type ChatsCreateOutput = Chat;
export type ChatsUpdateOutput = { success: boolean };
export type ChatsDeleteOutput = { success: boolean };
export type ChatsGetMessagesOutput = ChatMessage[];

// ============================================================================
// CLASSIFY (thought → artifact review)
// ============================================================================

export type ArtifactType = 'note' | 'task' | 'task_list' | 'tracker'

export type ChatsClassifyOutput = {
  targetType: ArtifactType
  proposedType: ArtifactType
  proposedTitle: string
  proposedChanges: string[]
  previewContent: string
  reviewItemId: string
}

export type ChatsClassifyInput = {
  targetType: ArtifactType
}

// ============================================================================
// MESSAGES OPERATIONS
// ============================================================================

export type MessagesGetOutput = { message: ChatMessage };

export type MessagesUpdateInput = {
  content: string;
};

export type MessagesUpdateOutput = { message: ChatMessage };

export type MessagesDeleteOutput = { success: boolean };

export type MessagesDeleteAfterInput = {
  chatId: string;
  afterTimestamp: string;
};

export type MessagesDeleteAfterOutput = { deletedCount: number };
