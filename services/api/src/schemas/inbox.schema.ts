import { z } from 'zod';

export const InboxQuerySchema = z.object({
  limit: z.string().optional(),
  cursor: z.string().optional(),
});
