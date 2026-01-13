import { getNearbyPlacesFromLists } from '@hominem/data/places';
import { z } from 'zod';
import { protectedProcedure } from '../context';

export const getNearbyFromLists = protectedProcedure
  .input(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
      radiusKm: z.number().optional().default(5),
      limit: z.number().optional().default(4),
    }),
  )
  .query(async ({ ctx, input }) => {
    const { latitude, longitude, radiusKm, limit: resultLimit } = input;

    try {
      return await getNearbyPlacesFromLists({
        userId: ctx.user.id,
        latitude,
        longitude,
        radiusKm,
        limit: resultLimit,
      });
    } catch {
      throw new Error('Failed to fetch nearby places');
    }
  });
