import { updateEvent } from '@hominem/data/events';
import { z } from 'zod';
import { protectedProcedure } from '../context';

export const updateVisit = protectedProcedure
  .input(
    z.object({
      visitId: z.uuid(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      date: z.union([z.string(), z.date()]).optional(),
      visitNotes: z.string().optional().nullable(),
      visitRating: z.number().int().min(1).max(5).optional().nullable(),
      visitReview: z.string().optional().nullable(),
      visitPeople: z.string().optional().nullable(),
      tags: z.array(z.string()).optional(),
      people: z.array(z.string()).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { visitId, date, ...updateData } = input;

    const updatedEvent = await updateEvent(visitId, {
      ...updateData,
      date: date ? new Date(date) : undefined,
    });

    if (!updatedEvent) {
      throw new Error('Visit not found');
    }

    return updatedEvent;
  });
