import * as z from 'zod'

export const flightSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  tripId: z.uuid().nullable().optional(),
  flightNumber: z.string().nullable().optional(),
  airline: z.string().nullable().optional(),
  departureAirport: z.string().nullable().optional(),
  arrivalAirport: z.string().nullable().optional(),
  departureTime: z.string().nullable().optional(),
  arrivalTime: z.string().nullable().optional(),
  confirmationCode: z.string().nullable().optional(),
  seat: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
})

export type FlightOutput = z.infer<typeof flightSchema>
