import { z } from 'zod';

export const ChatsSendSchema = z
  .object({
    generationId: z.uuid(),
    message: z.string(),
    fileIds: z.array(z.uuid()).max(5).optional(),
    responseModality: z.enum(['text', 'audio']).optional(),
    responseLength: z.enum(['short', 'medium', 'long']).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.message.trim().length === 0 && (!value.fileIds || value.fileIds.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'message or fileIds is required',
        path: ['message'],
      });
    }
  });

export const ChatsCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const ChatsListQuerySchema = z.object({
  cursor: z.string().min(1).max(512).optional(),
  includeArchived: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const ChatsStartStreamSchema = ChatsCreateSchema.extend({
  generationId: z.uuid(),
  message: z.string(),
  fileIds: z.array(z.uuid()).max(5).optional(),
  responseLength: z.enum(['short', 'medium', 'long']).optional(),
}).superRefine((value, ctx) => {
  if (value.message.trim().length === 0 && (!value.fileIds || value.fileIds.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'message or fileIds is required',
      path: ['message'],
    });
  }
});

export const ChatsUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const ChatsEditMessageSchema = z.object({
  content: z.string().trim().min(1).max(20_000),
});

export const ChatsRegenerateMessageSchema = z.object({
  generationId: z.uuid(),
  responseLength: z.enum(['short', 'medium', 'long']).optional(),
});

export const ChatsToolCallRespondSchema = z
  .object({
    approved: z.boolean(),
    responseLength: z.enum(['short', 'medium', 'long']).optional(),
  })
  .strict();

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
