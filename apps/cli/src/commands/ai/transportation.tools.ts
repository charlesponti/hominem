import { tool } from 'ai'
import { z } from 'zod'

export type TransportMethod = 'car' | 'bus' | 'train' | 'plane'

interface TripCost {
  type: 'transportation' | 'accommodation'
  cost: number
}

export const calculate_trip_costs = tool({
  description:
    'Calculate the costs for a trip, including transportation and accommodation if needed',
  parameters: z.object({
    needsTransportation: z.boolean().describe('Whether transportation is needed'),
    needsAccommodation: z.boolean().describe('Whether accommodation is needed'),
    startingPoint: z.string().describe('Starting location'),
    destination: z.string().describe('Destination location'),
    method: z.enum(['car', 'bus', 'train', 'plane']).describe('Transportation method'),
    location: z.string().describe('Location for accommodation'),
  }),
  async execute({
    needsTransportation,
    needsAccommodation,
    startingPoint,
    destination,
    method,
    location,
  }) {
    const results: TripCost[] = []

    if (needsTransportation) {
      const transportationCost = await calculate_transportation_costs.execute(
        {
          startingPoint,
          destination,
          method,
        },
        { messages: [], toolCallId: 'transportation_costs' }
      )
      results.push(transportationCost)
    }

    if (needsAccommodation) {
      const accommodationCost = await calculate_accommodation_costs.execute(
        {
          location,
        },
        { messages: [], toolCallId: 'accommodation_costs' }
      )
      results.push(accommodationCost)
    }

    return results
  },
})

export const calculate_transportation_costs = tool({
  description: 'Calculate the costs of transportation based on method and route',
  parameters: z.object({
    startingPoint: z.string().describe('Starting location'),
    destination: z.string().describe('Destination location'),
    method: z.enum(['car', 'bus', 'train', 'plane']).describe('Transportation method'),
  }),
  async execute({ startingPoint, destination, method }) {
    return new Promise<TripCost>((resolve) => {
      let cost = 0

      switch (method) {
        case 'car':
          cost = 100
          break
        case 'bus':
          cost = 300
          break
        case 'train':
          cost = 200
          break
        case 'plane':
          cost = 1000 // Adding default cost for plane
          break
      }

      setTimeout(() => {
        resolve({ type: 'transportation', cost })
      }, 200)
    })
  },
})

export const calculate_accommodation_costs = tool({
  description: 'Calculate the accommodation costs for a location',
  parameters: z.object({
    location: z.string().describe('Location for accommodation'),
  }),
  async execute({ location }) {
    return new Promise<TripCost>((resolve) => {
      setTimeout(() => {
        resolve({ type: 'accommodation', cost: 500 })
      }, 1000)
    })
  },
})

interface HistoricalFlightData {
  airportname: string
  chart_data: { year: string; price: string }[]
}

export const get_historical_flight_data = tool({
  description: 'Get historical flight price data between airports',
  parameters: z.object({
    origin: z.string().describe('Origin airport code'),
    departure: z.string().describe('Departure airport code'),
  }),
  async execute({ origin, departure }) {
    const response = await fetch('https://www.faredetective.com/faredetective/chart_data', {
      headers: {
        accept: 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        priority: 'u=1, i',
        'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        cookie: 'ci_session=8679afd5368ce911aef15e29f9bb21a7738c6acd',
        Referer: 'https://www.faredetective.com/farehistory',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
      body: new URLSearchParams({ arrival: origin, departure }).toString(),
      method: 'POST',
    })

    const body = (await response.json()) as HistoricalFlightData

    return body
  },
})
