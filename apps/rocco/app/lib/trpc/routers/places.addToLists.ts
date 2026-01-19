import { addPlaceToLists } from '@hominem/places-services';
import { z } from 'zod';

import { protectedProcedure } from '../context';

type ListSummary = { id: string; name: string };

export const addToLists = protectedProcedure
  .input(
    z.object({
      listIds: z.array(z.uuid()),
      place: z.object({
        googleMapsId: z.string(),
        name: z.string(),
        address: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        types: z.array(z.string()),
        imageUrl: z.string().optional().nullable(),
        websiteUri: z.string().optional().nullable(),
        phoneNumber: z.string().optional().nullable(),
      }),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const { listIds, place: placeInput } = input;

    // Transform input to PlaceInsert format
    const placeData = {
      googleMapsId: placeInput.googleMapsId,
      name: placeInput.name,
      address: placeInput.address ?? null,
      latitude: placeInput.latitude ?? null,
      longitude: placeInput.longitude ?? null,
      location: [placeInput.longitude, placeInput.latitude] as [number, number],
      types: placeInput.types ?? null,
      rating: null,
      websiteUri: placeInput.websiteUri ?? null,
      phoneNumber: placeInput.phoneNumber ?? null,
      photos: null,
      imageUrl: placeInput.imageUrl ?? null,
      priceLevel: null,
    };

    try {
      const result = await addPlaceToLists(ctx.user.id, listIds, placeData);
      return { place: result.place, lists: result.lists as ListSummary[] };
    } catch {
      throw new Error('Failed to process request');
    }
  });
