import { z } from 'zod'

import { FlightSchema as DbFlightSchema } from '@hominem/db/schema/travel'

export const flightSchema = DbFlightSchema.extend({})

export type FlightOutput = z.infer<typeof flightSchema>
