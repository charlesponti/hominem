import { z } from 'zod';

import type { EmptyInput } from './utils';

import { tripsGetByIdSchema, tripsCreateInputSchema, addItemToTripSchema } from '../routes/trips';

export type {
  TripsGetAllOutput,
  TripsGetByIdOutput,
  TripsCreateOutput,
  TripsAddItemOutput,
} from '../lib/typed-routes';

export type TripsGetAllInput = EmptyInput;
export type TripsGetByIdInput = z.infer<typeof tripsGetByIdSchema>;
export type TripsCreateInput = z.infer<typeof tripsCreateInputSchema>;
export type TripsAddItemInput = z.infer<typeof addItemToTripSchema>;
