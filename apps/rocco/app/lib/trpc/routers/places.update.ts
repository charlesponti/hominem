import { createOrUpdatePlace } from '@hominem/places-services';
import { z } from 'zod';

import { protectedProcedure } from '../context';

export const update = protectedProcedure
  .input(
    z.object({
      id: z.uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      imageUrl: z.string().optional(),
      rating: z.number().optional(),
      types: z.array(z.string()).optional(),
      websiteUri: z.string().optional(),
      phoneNumber: z.string().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, latitude, longitude, ...updateData } = input;

    const locationUpdate =
      latitude && longitude ? { location: [longitude, latitude] as [number, number] } : {};

    const updatedPlace = await createOrUpdatePlace(id, {
      ...updateData,
      ...locationUpdate,
    });

    if (!updatedPlace) {
      throw new Error("Place not found or you don't have permission to update it");
    }

    return updatedPlace;
  });
