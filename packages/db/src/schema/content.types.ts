/**
 * Computed Content Types
 *
 * This file contains all derived types computed from the Content schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from content.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { content, contentStrategies } from './content.schema'
import {
  ContentStrategySchema,
  ContentTypeSchema,
  ContentStatusSchema,
  SocialMediaMetadataSchema,
  SEOMetadataSchema,
  type ContentStrategy,
  type ContentType,
  type ContentStatus,
  type SocialMediaMetadata,
  type SEOMetadata,
} from './content.schema'
import {
  PublishingContentTypeSchema,
  AllContentTypeSchema,
  type PublishingContentType,
  type AllContentType,
} from './shared.schema'

// Inferred types from Drizzle schema
export type Content = InferSelectModel<typeof content>
export type ContentInsert = InferInsertModel<typeof content>
export type ContentStrategies = InferSelectModel<typeof contentStrategies>
export type ContentStrategiesInsert = InferInsertModel<typeof contentStrategies>

// Legacy aliases for backward compatibility
export type ContentOutput = Content
export type ContentInput = ContentInsert
export type ContentStrategiesOutput = ContentStrategies
export type ContentStrategiesInput = ContentStrategiesInsert
export type ContentStrategiesSelect = ContentStrategies

// ============================================
// REPOSITORY / DOMAIN TYPES
// ============================================

export type ContentCreatePayload = ContentInsert

export type ContentUpdatePayload = Partial<Omit<ContentInput, 'userId' | 'id'>>

// ============================================
// RE-EXPORT STABLE ZOD SCHEMAS
// ============================================

export {
  ContentStrategySchema,
  ContentTypeSchema,
  ContentStatusSchema,
  SocialMediaMetadataSchema,
  SEOMetadataSchema,
  PublishingContentTypeSchema,
  AllContentTypeSchema,
}

export type {
  ContentStrategy,
  ContentType,
  ContentStatus,
  SocialMediaMetadata,
  SEOMetadata,
  PublishingContentType,
  AllContentType,
}


