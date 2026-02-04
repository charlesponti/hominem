/**
 * Places Domain Types
 *
 * Single source of truth for all place-related API contracts.
 * These types are:
 * - Explicit (not inferred from code)
 * - Computed once, referenced everywhere
 * - Safe to import directly by apps and clients
 */

import { z } from 'zod';

// ============================================================================
// CREATE PLACE
// ============================================================================

/** Input: Data required to create a new place */
export type PlaceCreateInput = {
  name: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  googleMapsId: string;
  rating?: number;
  priceLevel?: number;
  photos?: string[];
  types?: string[];
  websiteUri?: string;
  phoneNumber?: string;
  listIds?: string[];
};

export const placeCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrl: z.string().optional(),
  googleMapsId: z.string(),
  rating: z.number().optional(),
  priceLevel: z.number().optional(),
  photos: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  websiteUri: z.string().optional(),
  phoneNumber: z.string().optional(),
  listIds: z.array(z.string()).optional(),
});

/** Output: Response after successfully creating a place */
export type PlaceCreateOutput = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  googleMapsId: string;
  rating: number | null;
  priceLevel: number | null;
  photos: string[] | null;
  types: string[] | null;
  websiteUri: string | null;
  phoneNumber: string | null;
  businessStatus: string | null;
  openingHours: string | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// UPDATE PLACE
// ============================================================================

export type PlaceUpdateInput = {
  id: string;
  name?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  rating?: number;
  priceLevel?: number;
  photos?: string[];
  types?: string[];
  websiteUri?: string;
  phoneNumber?: string;
};

export const placeUpdateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrl: z.string().optional(),
  rating: z.number().optional(),
  priceLevel: z.number().optional(),
  photos: z.array(z.string()).optional(),
  types: z.array(z.string()).optional(),
  websiteUri: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export type PlaceUpdateOutput = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  googleMapsId: string;
  rating: number | null;
  priceLevel: number | null;
  photos: string[] | null;
  types: string[] | null;
  websiteUri: string | null;
  phoneNumber: string | null;
  businessStatus: string | null;
  openingHours: string | null;
  updatedAt: string;
};

// ============================================================================
// DELETE PLACE
// ============================================================================

export type PlaceDeleteInput = { id: string };
export const placeDeleteSchema = z.object({ id: z.string() });
export type PlaceDeleteOutput = { success: boolean };

// ============================================================================
// GET PLACE DETAILS
// ============================================================================

export type PlaceGetDetailsByIdInput = { id: string };
export const placeGetByIdSchema = z.object({ id: z.string() });

export type PlaceGetDetailsByGoogleIdInput = { googleMapsId: string };
export const placeGetByGoogleIdSchema = z.object({ googleMapsId: z.string() });

export type PlaceGetDetailsByIdOutput = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  googleMapsId: string;
  rating: number | null;
  priceLevel: number | null;
  photos: string[] | null;
  types: string[] | null;
  websiteUri: string | null;
  phoneNumber: string | null;
  businessStatus: string | null;
  openingHours: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlaceGetDetailsByGoogleIdOutput = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  googleMapsId: string;
  rating: number | null;
  priceLevel: number | null;
  photos: string[] | null;
  types: string[] | null;
  websiteUri: string | null;
  phoneNumber: string | null;
  businessStatus: string | null;
  openingHours: string | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// AUTOCOMPLETE
// ============================================================================

export type PlaceAutocompleteInput = {
  query: string;
  location?: { lat: number; lng: number };
  radius?: number;
  types?: string[];
};

export const placeAutocompleteSchema = z.object({
  query: z.string().min(1),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  radius: z.number().optional(),
  types: z.array(z.string()).optional(),
});

export type PlaceAutocompleteOutput = Array<{
  place_id: string;
  text: string;
  address: string;
  location: { latitude: number; longitude: number } | null;
}>;

// ============================================================================
// LIST OPERATIONS
// ============================================================================

export type PlaceAddToListsInput = {
  placeId: string;
  listIds: string[];
};

export const placeAddToListsSchema = z.object({
  placeId: z.string(),
  listIds: z.array(z.string()),
});

export type PlaceAddToListsOutput = {
  success: boolean;
  addedToLists: number;
};

export type PlaceRemoveFromListInput = {
  placeId: string;
  listId: string;
};

export const placeRemoveFromListSchema = z.object({
  placeId: z.string(),
  listId: z.string(),
});

export type PlaceRemoveFromListOutput = null;

// ============================================================================
// NEARBY PLACES
// ============================================================================

export type PlaceGetNearbyFromListsInput = {
  location: { lat: number; lng: number };
  radius?: number;
  listIds?: string[];
  limit?: number;
};

export const placeGetNearbySchema = z.object({
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  radius: z.number().optional(),
  listIds: z.array(z.string()).optional(),
  limit: z.number().optional(),
});

export type PlaceGetNearbyFromListsOutput = Array<{
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  googleMapsId: string;
  rating: number | null;
  priceLevel: number | null;
  photos: string[] | null;
  types: string[] | null;
  websiteUri: string | null;
  phoneNumber: string | null;
  businessStatus: string | null;
  openingHours: string | null;
  distance: {
    km: number;
    miles: number;
  };
  lists: Array<{
    id: string;
    name: string;
  }>;
}>;

// ============================================================================
// VISIT OPERATIONS
// ============================================================================

export type PlaceLogVisitInput = {
  placeId: string;
  title?: string | undefined;
  description?: string | undefined;
  date: string;
  visitNotes?: string | undefined;
  visitRating?: number | undefined;
  visitReview?: string | undefined;
  tags?: string[] | undefined;
  people?: string[] | undefined;
};

export const placeLogVisitSchema = z.object({
  placeId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.string(),
  visitNotes: z.string().optional(),
  visitRating: z.number().min(1).max(5).optional(),
  visitReview: z.string().optional(),
  tags: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
});

export type PlaceLogVisitOutput = {
  id: string;
  title: string | null;
  description: string | null;
  date: string;
  placeId: string;
  visitNotes: string | null;
  visitRating: number | null;
  visitReview: string | null;
  tags: string[] | null;
  people: string[] | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export type PlaceGetMyVisitsInput = {
  placeId?: string;
  limit?: number;
  offset?: number;
};

export const placeGetMyVisitsSchema = z.object({
  placeId: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type PlaceGetMyVisitsOutput = Array<{
  id: string;
  title: string | null;
  description: string | null;
  date: string;
  placeId: string;
  place: {
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    imageUrl: string | null;
  };
  visitNotes: string | null;
  visitRating: number | null;
  visitReview: string | null;
  tags: string[] | null;
  people: string[] | null;
  createdAt: string;
  updatedAt: string;
}>;

export type PlaceGetPlaceVisitsInput = {
  placeId: string;
  limit?: number;
  offset?: number;
};

export const placeGetPlaceVisitsSchema = z.object({
  placeId: z.string(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export type PlaceGetPlaceVisitsOutput = Array<{
  id: string;
  title: string | null;
  description: string | null;
  date: string;
  placeId: string;
  visitNotes: string | null;
  visitRating: number | null;
  visitReview: string | null;
  tags: string[] | null;
  people: string[] | null;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}>;

export type PlaceUpdateVisitInput = {
  id: string;
  title?: string | undefined;
  description?: string | undefined;
  date?: string | undefined;
  visitNotes?: string | undefined;
  visitRating?: number | undefined;
  visitReview?: string | undefined;
  tags?: string[] | undefined;
  people?: string[] | undefined;
};

export const placeUpdateVisitSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  visitNotes: z.string().optional(),
  visitRating: z.number().min(1).max(5).optional(),
  visitReview: z.string().optional(),
  tags: z.array(z.string()).optional(),
  people: z.array(z.string()).optional(),
});

export type PlaceUpdateVisitOutput = {
  id: string;
  title: string | null;
  description: string | null;
  date: string;
  placeId: string;
  visitNotes: string | null;
  visitRating: number | null;
  visitReview: string | null;
  tags: string[] | null;
  people: string[] | null;
  userId: string;
  updatedAt: string;
};

export type PlaceDeleteVisitInput = { id: string };
export const placeDeleteVisitSchema = z.object({ id: z.string() });
export type PlaceDeleteVisitOutput = { success: boolean };

// ============================================================================
// VISIT STATS
// ============================================================================

export type PlaceGetVisitStatsInput = {
  placeId?: string;
  timeRange?: {
    start: string;
    end: string;
  };
};

export const placeGetVisitStatsSchema = z.object({
  placeId: z.string().optional(),
  timeRange: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
});

export type PlaceGetVisitStatsOutput = {
  totalVisits: number;
  averageRating?: number | undefined;
  lastVisit?: string | undefined;
  firstVisit?: string | undefined;
  tags: Array<{
    tag: string;
    count: number;
  }>;
  people: Array<{
    person: string;
    count: number;
  }>;
};
