import { z } from 'zod';

import {
  placeCreateSchema,
  placeUpdateSchema,
  placeDeleteSchema,
  placeAutocompleteSchema,
  placeGetByIdSchema,
  placeGetByGoogleIdSchema,
  placeAddToListsSchema,
  placeRemoveFromListSchema,
  placeGetNearbySchema,
  placeLogVisitSchema,
  placeGetMyVisitsSchema,
  placeGetPlaceVisitsSchema,
  placeUpdateVisitSchema,
  placeDeleteVisitSchema,
  placeGetVisitStatsSchema,
} from '../routes/places';

export type {
  PlaceCreateOutput,
  PlaceUpdateOutput,
  PlaceDeleteOutput,
  PlaceAutocompleteOutput,
  PlaceGetDetailsByIdOutput,
  PlaceGetDetailsByGoogleIdOutput,
  PlaceAddToListsOutput,
  PlaceRemoveFromListOutput,
  PlaceGetNearbyFromListsOutput,
  PlaceLogVisitOutput,
  PlaceGetMyVisitsOutput,
  PlaceGetPlaceVisitsOutput,
  PlaceUpdateVisitOutput,
  PlaceDeleteVisitOutput,
  PlaceGetVisitStatsOutput,
} from '../lib/typed-routes';

export type PlaceCreateInput = z.infer<typeof placeCreateSchema>;
export type PlaceUpdateInput = z.infer<typeof placeUpdateSchema>;
export type PlaceDeleteInput = z.infer<typeof placeDeleteSchema>;
export type PlaceAutocompleteInput = z.infer<typeof placeAutocompleteSchema>;
export type PlaceGetDetailsByIdInput = z.infer<typeof placeGetByIdSchema>;
export type PlaceGetDetailsByGoogleIdInput = z.infer<typeof placeGetByGoogleIdSchema>;
export type PlaceAddToListsInput = z.infer<typeof placeAddToListsSchema>;
export type PlaceRemoveFromListInput = z.infer<typeof placeRemoveFromListSchema>;
export type PlaceGetNearbyFromListsInput = z.infer<typeof placeGetNearbySchema>;
export type PlaceLogVisitInput = z.infer<typeof placeLogVisitSchema>;
export type PlaceGetMyVisitsInput = z.infer<typeof placeGetMyVisitsSchema>;
export type PlaceGetPlaceVisitsInput = z.infer<typeof placeGetPlaceVisitsSchema>;
export type PlaceUpdateVisitInput = z.infer<typeof placeUpdateVisitSchema>;
export type PlaceDeleteVisitInput = z.infer<typeof placeDeleteVisitSchema>;
export type PlaceGetVisitStatsInput = z.infer<typeof placeGetVisitStatsSchema>;
