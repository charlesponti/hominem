import * as z from 'zod'

export const NoteContentTypeSchema = z
  .enum(['note', 'document', 'task', 'timer', 'journal', 'tweet', 'essay', 'blog_post', 'social_post'])
  .describe('NoteContentType')
export const NoteStatusSchema = z.enum(['draft', 'published', 'archived']).describe('NoteStatus')
export const AllContentTypeSchema = NoteContentTypeSchema.describe('AllContentType')
export const ContentTagSchema = z.object({ value: z.string() })
const PublishingMetadataSchema = z.object({
  platform: z.string().optional(),
  url: z.string().optional(),
  externalId: z.string().optional(),
  seo: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      canonicalUrl: z.string().optional(),
      featuredImage: z.string().optional(),
    })
    .optional(),
  metrics: z
    .object({
      views: z.number().optional(),
      likes: z.number().optional(),
      reposts: z.number().optional(),
      replies: z.number().optional(),
      clicks: z.number().optional(),
    })
    .optional(),
  threadPosition: z.number().optional(),
  threadId: z.string().optional(),
  inReplyTo: z.string().optional(),
  scheduledFor: z.string().optional(),
  importedAt: z.string().optional(),
  importedFrom: z.string().optional(),
})
export const NoteAnalysisSchema = z.object({
  readingTimeMinutes: z.number().optional(),
  summary: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  language: z.string().optional(),
})
export const TaskStatusSchema = z
  .enum(['todo', 'pending', 'in_progress', 'done', 'completed', 'cancelled'])
  .describe('TaskStatus');
export const TaskPrioritySchema = z
  .enum(['low', 'medium', 'high', 'urgent'])
  .describe('TaskPriority');

export type AllContentType = z.infer<typeof AllContentTypeSchema>;
export type ContentTag = z.infer<typeof ContentTagSchema>;
export type NoteAnalysis = z.infer<typeof NoteAnalysisSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

const NoteMentionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const CreateNoteInputSchema = z.object({
  type: NoteContentTypeSchema.default('note'),
  status: NoteStatusSchema.default('draft').optional(),
  title: z.string().optional(),
  content: z.string(),
  fileIds: z.array(z.string().uuid()).max(5).optional(),
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
  fileIds: z.array(z.string().uuid()).max(5).optional(),
  excerpt: z.string().nullish(),
  scheduledFor: z.string().nullable().optional(),
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
