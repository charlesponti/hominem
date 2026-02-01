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
export type MovieOutput = Movie;
export type MovieInput = MovieInsert;

export type MovieViewingOutput = MovieViewing;
export type MovieViewingInput = MovieViewingInsert;
