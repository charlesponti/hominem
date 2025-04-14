import { travelPlanningTools } from '@hominem/utils/tools'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { generateObject } from 'ai'
import { z } from 'zod'
import { lmstudio } from '../utils/llm.js'

export function registerFlightsTool(server: McpServer) {
  server.tool(
    'get_flight_prices',
    {
      input: z.object({
        query: z
          .string()
          .describe(
            'Natural language query describing the flight route (e.g., "from New York to London")'
          ),
      }),
    },
    async ({ input }) => {
      try {
        // Convert natural language to airport codes
        const response = await generateObject({
          model: lmstudio('gemma-3-12b-it'),
          prompt: `
            Based on the user input, return the primary airport codes for the origin and destination cities.: 

            For instance, New York City would return JFK, and Los Angeles would return LAX.
            If there are multiple airports, return the one that is most commonly used for international flights.
            If you cannot find the airport code, return "unknown".
            If you are unsure, return "unknown".
            
            User input: ${input.query}
          `,
          schema: z.object({
            originCode: z.string(),
            destinationCode: z.string(),
          }),
        })

        const { originCode, destinationCode } = response.object

        if (originCode === 'unknown' || destinationCode === 'unknown') {
          return {
            content: [
              {
                type: 'text',
                text: 'Could not determine airport codes from the provided locations',
              },
            ],
          }
        }

        // Get historical flight data
        const flightData = await travelPlanningTools.get_historical_flight_data.execute(
          {
            origin: originCode,
            destination: destinationCode,
          },
          { messages: [], toolCallId: 'get_flights' }
        )

        const { chart_data: prices } = flightData
        if (prices.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No flight data found for the specified route',
              },
            ],
          }
        }

        const avgPrice =
          prices.reduce((acc, data) => acc + Number.parseFloat(data.price), 0) / prices.length

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  originCode,
                  destinationCode,
                  averagePrice: avgPrice,
                },
                null,
                2
              ),
            },
          ],
        }
      } catch (error) {
        console.error('[MCP Health Error]', error)
        return {
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : String(error),
            },
          ],
        }
      }
    }
  )
}
