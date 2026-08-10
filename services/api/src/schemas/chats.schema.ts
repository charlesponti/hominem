import * as z from 'zod';

export const ChatsSendSchema = z
  .object({
    message: z.string(),
    fileIds: z.array(z.uuid()).max(5).optional(),
    noteIds: z.array(z.uuid()).max(10).optional(),
    responseModality: z.enum(['text', 'audio']).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.message.trim().length === 0 &&
      (!value.fileIds || value.fileIds.length === 0) &&
      (!value.noteIds || value.noteIds.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'message, fileIds, or noteIds is required',
        path: ['message'],
      });
    }
  });

export const ChatsCreateSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const ChatsStartStreamSchema = ChatsCreateSchema.extend({
  message: z.string(),
  fileIds: z.array(z.uuid()).max(5).optional(),
  noteIds: z.array(z.uuid()).max(10).optional(),
}).superRefine((value, ctx) => {
  if (
    value.message.trim().length === 0 &&
    (!value.fileIds || value.fileIds.length === 0) &&
    (!value.noteIds || value.noteIds.length === 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'message, fileIds, or noteIds is required',
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

export const ChatsMessagesQuerySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
});
