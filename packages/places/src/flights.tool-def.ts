import { toolDefinition } from '@tanstack/ai'
import { getFlightPricesInputSchema, getFlightPricesOutputSchema, flightsService } from './flights.service'
import { z } from 'zod'

export const getFlightPricesDef = toolDefinition({
  name: 'get_flight_prices',
  description: 'Search for flight prices between cities',
  inputSchema: getFlightPricesInputSchema,
  outputSchema: getFlightPricesOutputSchema,
})

export const getFlightPricesServer = (input: unknown) =>
  flightsService.getPrices(input as unknown as z.infer<typeof getFlightPricesInputSchema>)
