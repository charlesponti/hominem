import * as z from 'zod';

export const ChatsCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const ChatsListQuerySchema = z.object({
  cursor: z.string().min(1).max(512).optional(),
  includeArchived: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const ChatsUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const ChatsEditMessageSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
});

export const ChatsMessagesQuerySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
});

export const ChatsSearchMessagesQuerySchema = z.object({
  query: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const ChatsAddSourceSchema = z.object({
  noteId: z.uuid(),
});
