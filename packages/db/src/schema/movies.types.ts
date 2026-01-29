/**
 * Computed Movie Types
 */

import type { Movie, MovieInsert, MovieViewing, MovieViewingInsert } from './movies.schema';

export type MovieOutput = Movie;
export type MovieInput = MovieInsert;

export type MovieViewingOutput = MovieViewing;
export type MovieViewingInput = MovieViewingInsert;

export { movie, movieViewings, movieRelations, movieViewingsRelations } from './movies.schema';
