import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

import {
  getFlightPricesInputSchema,
  getFlightPricesOutputSchema,
  flightsService,
} from './flights.service';

export const getFlightPricesDef = toolDefinition({
  name: 'get_flight_prices',
  description: 'Search for flight prices between cities',
  inputSchema: getFlightPricesInputSchema,
  outputSchema: getFlightPricesOutputSchema,
});

export const getFlightPricesServer = (input: z.infer<typeof getFlightPricesInputSchema>) =>
  flightsService.getPrices(input);
