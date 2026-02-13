import {
  NoteContentTypeSchema as DbNoteContentTypeSchema,
  NoteStatusSchema as DbNoteStatusSchema,
  PublishingMetadataSchema as DbPublishingMetadataSchema,
} from '@hominem/db/schema/notes';
import {
  AllContentTypeSchema as DbAllContentTypeSchema,
  ContentTagSchema as DbContentTagSchema,
} from '@hominem/db/schema/shared';
import {
  TaskPrioritySchema as DbTaskPrioritySchema,
  TaskStatusSchema as DbTaskStatusSchema,
} from '@hominem/db/schema/tasks';
import * as z from 'zod';

export const NoteContentTypeSchema = DbNoteContentTypeSchema.describe('NoteContentType');
export const NoteStatusSchema = DbNoteStatusSchema.describe('NoteStatus');
export const AllContentTypeSchema = DbAllContentTypeSchema.describe('AllContentType');
export const ContentTagSchema = DbContentTagSchema.extend({});
export const PublishingMetadataSchema = DbPublishingMetadataSchema.extend({});
export const TaskStatusSchema = DbTaskStatusSchema.describe('TaskStatus');
export const TaskPrioritySchema = DbTaskPrioritySchema.describe('TaskPriority');

export type NoteContentType = z.infer<typeof NoteContentTypeSchema>;
export type NoteStatus = z.infer<typeof NoteStatusSchema>;
export type AllContentType = z.infer<typeof AllContentTypeSchema>;
export type ContentTag = z.infer<typeof ContentTagSchema>;
export type PublishingMetadata = z.infer<typeof PublishingMetadataSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue | undefined }
  | JsonValue[];

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const NoteMentionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type NoteMention = z.infer<typeof NoteMentionSchema>;

export const CreateNoteInputSchema = z.object({
  type: NoteContentTypeSchema.default('note'),
  status: NoteStatusSchema.default('draft').optional(),
  title: z.string().optional(),
  content: z.string(),
  excerpt: z.string().optional(),
  tags: z.array(ContentTagSchema).optional().default([]),
  mentions: z.array(NoteMentionSchema).optional().default([]),
  publishingMetadata: PublishingMetadataSchema.optional(),
  analysis: JsonValueSchema.optional(),
});

export const UpdateNoteInputSchema = z.object({
  type: NoteContentTypeSchema.optional(),
  status: NoteStatusSchema.optional(),
  title: z.string().nullish(),
  content: z.string().optional(),
  excerpt: z.string().nullish(),
  tags: z.array(ContentTagSchema).nullish(),
  publishingMetadata: PublishingMetadataSchema.optional().nullish(),
  analysis: JsonValueSchema.optional().nullish(),
});

export const SyncNoteItemSchema = z.object({
  id: z.string().uuid().optional(),
  type: NoteContentTypeSchema,
  status: NoteStatusSchema.optional(),
  title: z.string().nullish(),
  content: z.string(),
  excerpt: z.string().nullish(),
  tags: z.array(ContentTagSchema).optional().default([]),
  mentions: z.array(NoteMentionSchema).optional().default([]),
  publishingMetadata: PublishingMetadataSchema.optional().nullish(),
  analysis: JsonValueSchema.optional().nullish(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().optional(),
  scheduledFor: z.string().optional(),
});

export const NotesListQuerySchema = z.object({
  types: z.string().optional(),
  status: z.string().optional(),
  tags: z.string().optional(),
  query: z.string().optional(),
  since: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  includeAllVersions: z.string().optional(),
});

export const PublishNoteSchema = PublishingMetadataSchema.pick({
  platform: true,
  url: true,
  externalId: true,
  scheduledFor: true,
  seo: true,
});

export const NotesSyncSchema = z.object({
  items: z.array(SyncNoteItemSchema),
});
