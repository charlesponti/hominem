import * as z from 'zod'

export const NoteContentTypeSchema = z.enum([
  'note',
  'document',
  'task',
  'timer',
  'journal',
  'tweet',
  'essay',
  'blog_post',
  'social_post',
])

export const AllContentTypeSchema = NoteContentTypeSchema

export const NoteStatusSchema = z.enum(['draft', 'published', 'archived'])

export const ContentTagSchema = z.object({ value: z.string() })

export const NoteAnalysisSchema = z.object({
  readingTimeMinutes: z.number().optional(),
  summary: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  language: z.string().optional(),
})

export const PublishingMetadataSchema = z.object({
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

export const NoteMentionSchema = z.object({
  id: z.string(),
  name: z.string(),
})

export type NoteContentType = z.infer<typeof NoteContentTypeSchema>
export type AllContentType = z.infer<typeof AllContentTypeSchema>
export type NoteStatus = z.infer<typeof NoteStatusSchema>
export type ContentTag = z.infer<typeof ContentTagSchema>
export type NoteAnalysis = z.infer<typeof NoteAnalysisSchema>
export type PublishingMetadata = z.infer<typeof PublishingMetadataSchema>
export type NoteMention = z.infer<typeof NoteMentionSchema>

export interface Note {
  id: string
  userId: string
  type: NoteContentType
  status: NoteStatus
  title: string | null
  content: string
  excerpt: string | null
  tags: ContentTag[]
  mentions: NoteMention[] | null
  analysis: NoteAnalysis | null
  publishingMetadata: PublishingMetadata | null
  parentNoteId: string | null
  versionNumber: number
  isLatestVersion: boolean
  publishedAt: string | null
  scheduledFor: string | null
  createdAt: string
  updatedAt: string
}

export interface NoteInsert {
  id?: string
  userId: string
  type?: NoteContentType
  status?: NoteStatus
  title?: string | null
  content: string
  excerpt?: string | null
  tags?: ContentTag[]
  mentions?: NoteMention[] | null
  analysis?: NoteAnalysis | null
  publishingMetadata?: PublishingMetadata | null
  parentNoteId?: string | null
  versionNumber?: number
  isLatestVersion?: boolean
  publishedAt?: string | null
  scheduledFor?: string | null
  createdAt?: string
  updatedAt?: string
}

export type NoteOutput = Note
export type NoteInput = NoteInsert
export type NoteSyncItem = Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
  createdAt?: string
  updatedAt?: string
}
