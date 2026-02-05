/**
 * Computed Movie Types
 *
 * This file contains all derived types computed from the Movie schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from movies.schema.ts
 */

import type {
  Movie,
  MovieInsert,
  MovieSelect,
  MovieViewing,
  MovieViewingInsert,
  MovieViewingSelect,
} from './movies.schema';

export type {
  Movie,
  MovieInsert,
  MovieSelect,
  MovieViewing,
  MovieViewingInsert,
  MovieViewingSelect,
};

// Legacy aliases for backward compatibility
/**
 * @deprecated Use {@link Movie} instead. This alias will be removed in a future version.
 */
export type MovieOutput = Movie;

/**
 * @deprecated Use {@link MovieInsert} instead. This alias will be removed in a future version.
 */
export type MovieInput = MovieInsert;

/**
 * @deprecated Use {@link MovieViewing} instead. This alias will be removed in a future version.
 */
export type MovieViewingOutput = MovieViewing;

/**
 * @deprecated Use {@link MovieViewingInsert} instead. This alias will be removed in a future version.
 */
export type MovieViewingInput = MovieViewingInsert;
