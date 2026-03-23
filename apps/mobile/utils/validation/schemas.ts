import { z } from 'zod';

// User Profile Schema
export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

// Chat Message Schema
export const ChatMessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  role: z.enum(['user', 'assistant', 'system'] as const),
  content: z.string(),
  createdAt: z.string().datetime(),
  reasoning: z.string().nullable().optional(),
  toolCalls: z
    .array(
      z.object({
        toolName: z.string(),
        type: z.literal('tool-call'),
        toolCallId: z.string(),
        args: z.record(z.string(), z.string()),
      }),
    )
    .nullable()
    .optional(),
  isStreaming: z.boolean().optional(),
  focusItemsJson: z.string().nullable().optional(),
  focusIdsJson: z.string().nullable().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Chat Schema
export const ChatSchema = z.object({
  archivedAt: z.string().datetime().nullable().optional(),
  id: z.string(),
  createdAt: z.string().datetime(),
  title: z.string().nullable().optional(),
});

export type Chat = z.infer<typeof ChatSchema>;

// Note Schema (from API)
export const NoteSchema = z.object({
  id: z.string(),
  type: z.string(),
  status: z.enum(['draft', 'published', 'archived'] as const),
  title: z.string(),
  content: z.string(),
  excerpt: z.string(),
  tags: z.array(z.string()),
  mentions: z.array(z.unknown()),
  analysis: z.record(z.string(), z.unknown()).nullable(),
  publishingMetadata: z.record(z.string(), z.unknown()).nullable(),
  parentNoteId: z.string().nullable(),
  versionNumber: z.number(),
  isLatestVersion: z.boolean(),
  userId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
  scheduledFor: z.string().datetime().nullable(),
});

export type Note = z.infer<typeof NoteSchema>;

// API Response Schemas
export const NotesResponseSchema = z.object({
  notes: z.array(NoteSchema),
});

export const ChatMessagesResponseSchema = z.object({
  messages: z.array(ChatMessageSchema),
});

export const ChatResponseSchema = z.object({
  chat: ChatSchema,
});

// Validation helpers
export function validateUserProfile(data: unknown): UserProfile {
  return UserProfileSchema.parse(data);
}

export function validateChatMessage(data: unknown): ChatMessage {
  return ChatMessageSchema.parse(data);
}

export function validateNote(data: unknown): Note {
  return NoteSchema.parse(data);
}

export function validateNotesResponse(data: unknown): z.infer<typeof NotesResponseSchema> {
  return NotesResponseSchema.parse(data);
}

export function validateChatMessagesResponse(
  data: unknown,
): z.infer<typeof ChatMessagesResponseSchema> {
  return ChatMessagesResponseSchema.parse(data);
}

// Settings Schema
export const SettingsSchema = z.object({
  id: z.string(),
  theme: z.string().nullable().optional(),
  preferencesJson: z.string().nullable().optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;

// Media Schema
export const MediaSchema = z.object({
  id: z.string(),
  type: z.string(),
  localURL: z.string(),
  createdAt: z.string().datetime(),
});

export type Media = z.infer<typeof MediaSchema>;
