import * as z from 'zod';

export const getFlightPricesInputSchema = z.object({
  query: z
    .string()
    .describe(
      'Natural language query for flight search (e.g., "from New York to London next week")',
    ),
});

export const FlightSchema = z.object({
  airline: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  duration: z.string(),
  price: z.number(),
  currency: z.string(),
});

export const getFlightPricesOutputSchema = z.object({
  originCode: z.string().describe('IATA code for departure city'),
  destinationCode: z.string().describe('IATA code for destination city'),
  flights: z.array(FlightSchema).optional(),
});

export class FlightsService {
  async getPrices(_: z.infer<typeof getFlightPricesInputSchema>) {
    // TODO: Hook into a real flights API
    return { originCode: 'NYC', destinationCode: 'LON', flights: [] };
  }
}

export const flightsService = new FlightsService();
