/**
 * Computed Music Types
 *
 * This file contains all derived types computed from the Music schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from music.schema.ts
 */

import type {
  Artist,
  ArtistInsert,
  ArtistSelect,
  ArtistInsertSchemaType,
  ArtistSelectSchemaType,
  UserArtist,
  UserArtistInsert,
  UserArtistSelect,
  UserArtistInsertSchemaType,
  UserArtistSelectSchemaType,
} from './music.schema';

export type {
  Artist,
  ArtistInsert,
  ArtistSelect,
  ArtistInsertSchemaType,
  ArtistSelectSchemaType,
  UserArtist,
  UserArtistInsert,
  UserArtistSelect,
  UserArtistInsertSchemaType,
  UserArtistSelectSchemaType,
};

// Legacy aliases for backward compatibility
export type ArtistOutput = Artist;
export type ArtistInput = ArtistInsert;

export type UserArtistOutput = UserArtist;
export type UserArtistInput = UserArtistInsert;
