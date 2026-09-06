import { z } from 'zod';

export const generationPhaseSchema = z.enum([
  'preparing',
  'running',
  'awaiting_confirmation',
  'saving',
  'cancel_requested',
  'committed',
  'cancelled',
  'failed',
]);

export const generationActivePhaseSchema = generationPhaseSchema.exclude([
  'committed',
  'cancelled',
  'failed',
]);

export type GenerationPhase = z.infer<typeof generationPhaseSchema>;
export type GenerationActivePhase = z.infer<typeof generationActivePhaseSchema>;
