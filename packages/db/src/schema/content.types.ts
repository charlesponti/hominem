/**
 * Computed Content Types
 *
 * This file contains all derived types computed from the Content schema.
 * These types are inferred from Drizzle ORM schema definitions or Zod schemas.
 *
 * Rule: Import from this file, not from content.schema.ts
 */

import type {
  Content,
  ContentInsert,
  ContentSelect,
  ContentStrategies,
  ContentStrategiesInsert,
  ContentStrategiesSelect,
  ContentStrategy,
  ContentType,
  ContentStatus,
  SocialMediaMetadata,
  SEOMetadata,
} from './content.schema';

export type {
  Content,
  ContentInsert,
  ContentSelect,
  ContentStrategies,
  ContentStrategiesInsert,
  ContentStrategiesSelect,
  ContentStrategy,
  ContentType,
  ContentStatus,
  SocialMediaMetadata,
  SEOMetadata,
};

// Legacy aliases for backward compatibility
export type ContentOutput = Content;
export type ContentInput = ContentInsert;

export type ContentStrategiesOutput = ContentStrategies;
export type ContentStrategiesInput = ContentStrategiesInsert;
