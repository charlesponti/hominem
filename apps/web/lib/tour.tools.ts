import { z } from 'zod'
import { tool } from 'ai'

import { getDaysBetweenDates } from '@ponti/utils/time'

const PERFORMANCES = [
  { id: '1', date: '2023-10-01', event: 'Coachella', tourId: 1 },
  { id: '2', date: '2023-10-02', event: 'Eras Tour' },
  { id: '3', date: '2023-10-03', event: 'Big Concert', tourId: 2 },
  { id: '4', date: '2023-10-04', event: 'Medium-sized Concert', tourId: 2 },
  { id: '5', date: '2023-10-05', event: 'Small Concert', tourId: 1 },
]

const TICKET_SALES = [
  { date: '2023-10-01', ticketsSold: 100, eventId: PERFORMANCES[0].id },
  { date: '2023-10-02', ticketsSold: 150, eventId: PERFORMANCES[1].id },
  { date: '2023-10-03', ticketsSold: 200, eventId: PERFORMANCES[1].id },
  { date: '2023-10-04', ticketsSold: 250, eventId: PERFORMANCES[1].id },
  { date: '2023-10-05', ticketsSold: 300, eventId: PERFORMANCES[1].id },
]

const PERFORMANCE_FINANCES = [
  {
    date: '2023-10-01',
    revenue: 1000,
    expenses: 500,
    eventId: PERFORMANCES[0].id,
  },
  {
    date: '2023-10-02',
    revenue: 1500,
    expenses: 700,
    eventId: PERFORMANCES[0].id,
  },
  {
    date: '2023-10-03',
    revenue: 2000,
    expenses: 800,
    eventId: PERFORMANCES[0].id,
  },
  {
    date: '2023-10-04',
    revenue: 2500,
    expenses: 900,
    eventId: PERFORMANCES[2].id,
  },
  {
    date: '2023-10-05',
    revenue: 3000,
    expenses: 1000,
    eventId: PERFORMANCES[2].id,
  },
]

const PERFORMANCE_MERCHANDISE_SALES = [
  { date: '2023-10-01', merchandiseSold: 100, eventId: PERFORMANCES[0].id },
  { date: '2023-10-02', merchandiseSold: 150, eventId: PERFORMANCES[1].id },
  { date: '2023-10-03', merchandiseSold: 200, eventId: PERFORMANCES[1].id },
  { date: '2023-10-04', merchandiseSold: 250, eventId: PERFORMANCES[1].id },
  { date: '2023-10-05', merchandiseSold: 300, eventId: PERFORMANCES[1].id },
]

export const revenueCalculatorSchema = z.object({
  ticketPrice: z.number(),
  expectedAttendance: z.number(),
  venueSize: z.number(),
})

export const performanceCostCalculatorTool = tool({
  description: 'Calculate revenue for a performance',
  parameters: revenueCalculatorSchema,
  async execute(details): Promise<number> {
    const { ticketPrice, expectedAttendance, venueSize } = details
    return ticketPrice * Math.min(expectedAttendance, venueSize)
  },
})

const transportationCostCalculatorSchema = z.object({
  distance: z.number(),
  fuelCost: z.number(),
  baggageFees: z.number(),
  travelMode: z.string(),
})

export const transportationCostCalculatorTool = tool({
  description: 'Calculate transportation costs',
  parameters: transportationCostCalculatorSchema,
  async execute(details): Promise<number> {
    const { distance, fuelCost, baggageFees, travelMode } = details
    if (travelMode === 'flying') {
      return distance * fuelCost + baggageFees
    }

    return distance * fuelCost
  },
})

const accommodationCostCalculatorSchema = z.object({
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  nights: z.number(),
  hotelCostPerNight: z.number(),
  alternativeLodgingCost: z.number(),
})

export const accommodationCostCalculatorTool = tool({
  description: 'Calculate accommodation costs',
  parameters: accommodationCostCalculatorSchema,
  async execute(details): Promise<number> {
    const { startDate, endDate, hotelCostPerNight, alternativeLodgingCost } = details
    const nights = getDaysBetweenDates(new Date(startDate), new Date(endDate))
    return nights * Math.min(hotelCostPerNight, alternativeLodgingCost)
  },
})

const performanceLocationSchema = z.object({
  location_query: z.string().describe('The location to search for'),
})
export const get_performance_location_suggestions = tool({
  description: 'Search for regions the user could perform if they do not provide a location',
  parameters: performanceLocationSchema,
  async execute() {
    return [
      {
        location: 'New York City',
      },
      {
        location: 'Los Angeles',
      },
      {
        location: 'Chicago',
      },
      {
        location: 'San Francisco',
      },
    ]
  },
})

export const get_performances = tool({
  description: 'A tool to get one or more events by id, name, or date.',
  parameters: z.object({
    query: z.object({
      eventName: z.string().optional(),
      eventId: z.string().optional(),
      eventDate: z.string().optional(),
    }),
  }),
  execute: async ({ query }) => {
    if (query.eventId) {
      return PERFORMANCES.filter((performance) => performance.id === query.eventId)
    }

    return PERFORMANCES
  },
})

export const get_performance_finances_by_id = tool({
  description: 'A tool for getting financial data for an event.',
  parameters: z.object({ eventId: z.string() }),
  execute: async ({ eventId }) => {
    return PERFORMANCE_FINANCES.filter((finances) => finances.eventId === eventId)
  },
})

export const get_performance_ticket_sales_by_id = tool({
  description: 'A tool for getting ticket sales data for an event.',
  parameters: z.object({
    query: z.object({
      incomeType: z.string(z.enum(['tickets', 'merchandise'])),
      eventId: z.string().optional(),
    }),
  }),
  execute: async ({ query }) => {
    const filter = (
      item: (typeof TICKET_SALES)[number] | (typeof PERFORMANCE_MERCHANDISE_SALES)[number]
    ) => item.eventId === query.eventId
    switch (query.incomeType) {
      case 'merchandise':
        return PERFORMANCE_MERCHANDISE_SALES.filter(filter)
      case 'tickets':
        return TICKET_SALES.filter(filter)
      default:
        return []
    }
  },
})
