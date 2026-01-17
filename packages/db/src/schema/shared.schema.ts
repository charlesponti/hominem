import { z } from 'zod'

/**
 * Shared content tag for categorization across all content types
 */
export const ContentTagSchema = z.object({
  value: z.string(),
})

export type ContentTag = z.infer<typeof ContentTagSchema>

/**
 * Base content types that can be used across different schemas
 */
export const BaseContentTypeSchema = z.enum([
  'note', // Standard note
  'task', // Task with status tracking
  'timer', // Time-trackable task
  'journal', // Journal entry
  'document', // Longer form document
])

export type BaseContentType = z.infer<typeof BaseContentTypeSchema>

/**
 * Publishing-specific content types for internet-facing content
 */
export const PublishingContentTypeSchema = z.enum([
  'tweet', // Twitter/X posts
  'essay', // Long-form essays
  'blog_post', // Blog posts
  'social_post', // Generic social media post
])

export type PublishingContentType = z.infer<typeof PublishingContentTypeSchema>

/**
 * Union type for all content types
 */
export const AllContentTypeSchema = z.union([BaseContentTypeSchema, PublishingContentTypeSchema])
export type AllContentType = z.infer<typeof AllContentTypeSchema>
