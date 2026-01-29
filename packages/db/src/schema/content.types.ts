/**
 * Computed Content Types
 *
 * This file contains all derived types computed from the Content schema.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from content.schema.ts
 */

import type { Content, ContentInsert, ContentStrategies, ContentStrategiesInsert } from './content.schema';
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
} from './content.schema';

// ============================================
// PRIMARY OUTPUT TYPES (computed once)
// ============================================

/** Content as retrieved from database */
export type ContentOutput = Content;

/** Content insert input (for creating content) */
export type ContentInput = ContentInsert;

/** ContentStrategies as retrieved from database */
export type ContentStrategiesOutput = ContentStrategies;

/** ContentStrategies insert input (for creating content strategies) */
export type ContentStrategiesInput = ContentStrategiesInsert;

// Legacy aliases
export type ContentStrategiesSelect = ContentStrategies;

// ============================================
// REPOSITORY / DOMAIN TYPES
// ============================================

export type ContentCreatePayload = ContentInsert;

export type ContentUpdatePayload = Partial<Omit<ContentInput, 'userId' | 'id'>>;

// ============================================
// RE-EXPORT STABLE ZOD SCHEMAS
// ============================================

export {
  ContentStrategySchema,
  ContentTypeSchema,
  ContentStatusSchema,
  SocialMediaMetadataSchema,
  SEOMetadataSchema,
};

export type {
  ContentStrategy,
  ContentType,
  ContentStatus,
  SocialMediaMetadata,
  SEOMetadata,
};
