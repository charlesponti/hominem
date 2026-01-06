import { toolDefinition } from '@tanstack/ai'
import { z } from 'zod'

/**
 * Flights Tool
 * Type-safe tool definitions for flight search and booking using TanStack AI
 */

import {
  getFlightPricesInputSchema,
  getFlightPricesOutputSchema,
} from '@hominem/data/services/flights'

export const getFlightPricesDef = toolDefinition({
  name: 'get_flight_prices',
  description: 'Search for flight prices between cities',
  inputSchema: getFlightPricesInputSchema,
  outputSchema: getFlightPricesOutputSchema,
})
