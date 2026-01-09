import { getFlightPricesInputSchema, getFlightPricesOutputSchema } from '@hominem/data/travel'
import { toolDefinition } from '@tanstack/ai'

export const getFlightPricesDef = toolDefinition({
  name: 'get_flight_prices',
  description: 'Search for flight prices between cities',
  inputSchema: getFlightPricesInputSchema,
  outputSchema: getFlightPricesOutputSchema,
})
