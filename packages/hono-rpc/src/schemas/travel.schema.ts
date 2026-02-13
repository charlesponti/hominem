import { FlightSchema as DbFlightSchema } from '@hominem/db/schema/travel';
import * as z from 'zod';

export const flightSchema = DbFlightSchema.extend({});

export type FlightOutput = z.infer<typeof flightSchema>;
