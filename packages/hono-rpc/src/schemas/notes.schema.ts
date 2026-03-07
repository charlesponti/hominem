import {
  NoteContentTypeSchema as NotesNoteContentTypeSchema,
  NoteStatusSchema as NotesNoteStatusSchema,
  PublishingMetadataSchema as NotesPublishingMetadataSchema,
  NoteAnalysisSchema as NotesNoteAnalysisSchema,
  AllContentTypeSchema as NotesAllContentTypeSchema,
  ContentTagSchema as NotesContentTagSchema,
} from '@hominem/notes-services';
import * as z from 'zod';

export const NoteContentTypeSchema = NotesNoteContentTypeSchema.describe('NoteContentType');
export const NoteStatusSchema = NotesNoteStatusSchema.describe('NoteStatus');
export const AllContentTypeSchema = NotesAllContentTypeSchema.describe('AllContentType');
export const ContentTagSchema = NotesContentTagSchema.extend({});
const PublishingMetadataSchema = NotesPublishingMetadataSchema.extend({});
export const NoteAnalysisSchema = NotesNoteAnalysisSchema.extend({});
export const TaskStatusSchema = z
  .enum(['todo', 'pending', 'in_progress', 'done', 'completed', 'cancelled'])
  .describe('TaskStatus');
export const TaskPrioritySchema = z
  .enum(['low', 'medium', 'high', 'urgent'])
  .describe('TaskPriority');

type NoteContentType = z.infer<typeof NoteContentTypeSchema>;
type NoteStatus = z.infer<typeof NoteStatusSchema>;
export type AllContentType = z.infer<typeof AllContentTypeSchema>;
export type ContentTag = z.infer<typeof ContentTagSchema>;
type PublishingMetadata = z.infer<typeof PublishingMetadataSchema>;
export type NoteAnalysis = z.infer<typeof NoteAnalysisSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

type JsonValue =
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

const NoteMentionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

type NoteMention = z.infer<typeof NoteMentionSchema>;

export const CreateNoteInputSchema = z.object({
  type: NoteContentTypeSchema.default('note'),
  status: NoteStatusSchema.default('draft').optional(),
  title: z.string().optional(),
  content: z.string(),
  excerpt: z.string().optional(),
  tags: z.array(ContentTagSchema).optional().default([]),
  mentions: z.array(NoteMentionSchema).optional().default([]),
  publishingMetadata: PublishingMetadataSchema.optional(),
  analysis: NoteAnalysisSchema.optional(),
});

export const UpdateNoteInputSchema = z.object({
  type: NoteContentTypeSchema.optional(),
  status: NoteStatusSchema.optional(),
  title: z.string().nullish(),
  content: z.string().optional(),
  excerpt: z.string().nullish(),
  tags: z.array(ContentTagSchema).nullish(),
  publishingMetadata: PublishingMetadataSchema.optional().nullish(),
  analysis: NoteAnalysisSchema.optional().nullish(),
});

const SyncNoteItemSchema = z.object({
  id: z.string().uuid().optional(),
  type: NoteContentTypeSchema,
  status: NoteStatusSchema.optional(),
  title: z.string().nullish(),
  content: z.string(),
  excerpt: z.string().nullish(),
  tags: z.array(ContentTagSchema).optional().default([]),
  mentions: z.array(NoteMentionSchema).optional().default([]),
  publishingMetadata: PublishingMetadataSchema.optional().nullish(),
  analysis: NoteAnalysisSchema.optional().nullish(),
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
