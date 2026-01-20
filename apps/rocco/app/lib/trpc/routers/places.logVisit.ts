import { createEvent } from '@hominem/events-services';
import { z } from 'zod';

import { protectedProcedure } from '../context';

export const logVisit = protectedProcedure
  .input(
    z.object({
      placeId: z.uuid(),
      title: z.string().min(1),
      description: z.string().optional(),
      date: z.union([z.string(), z.date()]).optional(),
      visitNotes: z.string().optional(),
      visitRating: z.number().int().min(1).max(5).optional(),
      visitReview: z.string().optional(),
      tags: z.array(z.string()).optional(),
      people: z.array(z.string()).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const dateValue = input.date ? new Date(input.date) : new Date();

    const event = await createEvent({
      title: input.title,
      description: input.description,
      date: dateValue,
      type: 'Events',
      placeId: input.placeId,
      visitNotes: input.visitNotes,
      visitRating: input.visitRating,
      visitReview: input.visitReview,
      userId: ctx.user.id,
      tags: input.tags,
      people: input.people,
    });

    return event;
  });
