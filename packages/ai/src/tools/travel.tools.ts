import { db } from '@hominem/utils/db'
import { activity, flight, hotel, transport } from '@hominem/utils/schema'
import { tool } from 'ai'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

export const create_flight = tool({
  description: 'Create a new flight record',
  parameters: z.object({
    flightNumber: z.string().describe('Flight number'),
    departureAirport: z.string().describe('Departure airport code'),
    departureDate: z.string().describe('Departure date and time'),
    arrivalAirport: z.string().describe('Arrival airport code'),
    arrivalDate: z.string().describe('Arrival date and time'),
    airline: z.string().describe('Name of the airline'),
    reservationNumber: z.string().describe('Reservation confirmation number'),
    url: z.string().optional().describe('URL for the booking'),
    userId: z.string().uuid().describe('User ID'),
    listId: z.string().uuid().optional().describe('Optional list ID to associate with the flight'),
  }),
  execute: async (params) => {
    try {
      const flightData = await db
        .insert(flight)
        .values({
          id: crypto.randomUUID(),
          ...params,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning()

      return { success: true, flight: flightData[0] }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const get_flights = tool({
  description: 'Get flights for a user',
  parameters: z.object({
    userId: z.string().uuid().describe('User ID'),
    listId: z.string().uuid().optional().describe('Optional list ID to filter flights'),
  }),
  execute: async ({ userId, listId }) => {
    try {
      const query = db
        .select()
        .from(flight)
        .where(and(eq(flight.userId, userId), listId ? eq(flight.listId, listId) : undefined))

      const flights = await query.orderBy(flight.departureDate)
      return { success: true, flights }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const update_flight = tool({
  description: 'Update a flight record',
  parameters: z.object({
    id: z.string().uuid().describe('Flight ID'),
    flightNumber: z.string().optional().describe('Flight number'),
    departureAirport: z.string().optional().describe('Departure airport code'),
    departureDate: z.string().optional().describe('Departure date and time'),
    arrivalAirport: z.string().optional().describe('Arrival airport code'),
    arrivalDate: z.string().optional().describe('Arrival date and time'),
    airline: z.string().optional().describe('Name of the airline'),
    reservationNumber: z.string().optional().describe('Reservation confirmation number'),
    url: z.string().optional().describe('URL for the booking'),
    listId: z.string().uuid().optional().describe('Optional list ID'),
  }),
  execute: async ({ id, ...params }) => {
    try {
      const updatedFlight = await db
        .update(flight)
        .set({
          ...params,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(flight.id, id))
        .returning()

      if (updatedFlight.length === 0) {
        return { success: false, error: 'Flight not found' }
      }

      return { success: true, flight: updatedFlight[0] }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const delete_flight = tool({
  description: 'Delete a flight record',
  parameters: z.object({
    id: z.string().uuid().describe('Flight ID to delete'),
  }),
  execute: async ({ id }) => {
    try {
      const deletedFlight = await db.delete(flight).where(eq(flight.id, id)).returning()

      if (deletedFlight.length === 0) {
        return { success: false, error: 'Flight not found' }
      }

      return { success: true, message: 'Flight deleted successfully' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const create_hotel = tool({
  description: 'Create a new hotel booking record',
  parameters: z.object({
    name: z.string().describe('Hotel name'),
    address: z.string().describe('Hotel address'),
    checkInDate: z.string().describe('Check-in date and time'),
    checkOutDate: z.string().describe('Check-out date and time'),
    reservationNumber: z.string().describe('Reservation confirmation number'),
    roomType: z.string().describe('Type of room booked'),
    numberOfGuests: z.string().describe('Number of guests'),
    url: z.string().describe('URL for the booking'),
    phoneNumber: z.string().optional().describe('Hotel phone number'),
    price: z.string().optional().describe('Price of the stay'),
    notes: z.string().optional().describe('Additional notes'),
    userId: z.string().uuid().describe('User ID'),
    listId: z
      .string()
      .uuid()
      .optional()
      .describe('Optional list ID to associate with the hotel booking'),
  }),
  execute: async (params) => {
    try {
      const hotelData = await db
        .insert(hotel)
        .values({
          id: crypto.randomUUID(),
          ...params,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning()

      return { success: true, hotel: hotelData[0] }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const get_hotels = tool({
  description: 'Get hotel bookings for a user',
  parameters: z.object({
    userId: z.string().uuid().describe('User ID'),
    listId: z.string().uuid().optional().describe('Optional list ID to filter hotels'),
  }),
  execute: async ({ userId, listId }) => {
    try {
      const query = db
        .select()
        .from(hotel)
        .where(and(eq(hotel.userId, userId), listId ? eq(hotel.listId, listId) : undefined))

      const hotels = await query.orderBy(hotel.checkInDate)
      return { success: true, hotels }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const update_hotel = tool({
  description: 'Update a hotel booking record',
  parameters: z.object({
    id: z.string().uuid().describe('Hotel booking ID'),
    name: z.string().optional().describe('Hotel name'),
    address: z.string().optional().describe('Hotel address'),
    checkInDate: z.string().optional().describe('Check-in date and time'),
    checkOutDate: z.string().optional().describe('Check-out date and time'),
    reservationNumber: z.string().optional().describe('Reservation confirmation number'),
    roomType: z.string().optional().describe('Type of room booked'),
    numberOfGuests: z.string().optional().describe('Number of guests'),
    url: z.string().optional().describe('URL for the booking'),
    phoneNumber: z.string().optional().describe('Hotel phone number'),
    price: z.string().optional().describe('Price of the stay'),
    notes: z.string().optional().describe('Additional notes'),
    listId: z.string().uuid().optional().describe('Optional list ID'),
  }),
  execute: async ({ id, ...params }) => {
    try {
      const updatedHotel = await db
        .update(hotel)
        .set({
          ...params,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(hotel.id, id))
        .returning()

      if (updatedHotel.length === 0) {
        return { success: false, error: 'Hotel booking not found' }
      }

      return { success: true, hotel: updatedHotel[0] }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const delete_hotel = tool({
  description: 'Delete a hotel booking record',
  parameters: z.object({
    id: z.string().uuid().describe('Hotel booking ID to delete'),
  }),
  execute: async ({ id }) => {
    try {
      const deletedHotel = await db.delete(hotel).where(eq(hotel.id, id)).returning()

      if (deletedHotel.length === 0) {
        return { success: false, error: 'Hotel booking not found' }
      }

      return { success: true, message: 'Hotel booking deleted successfully' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const create_transport = tool({
  description: 'Create a new transport record (taxi, train, bus, etc.)',
  parameters: z.object({
    type: z.string().describe('Type of transport (taxi, train, bus, etc.)'),
    departureLocation: z.string().describe('Departure location'),
    arrivalLocation: z.string().describe('Arrival location'),
    departureTime: z.string().describe('Departure date and time'),
    arrivalTime: z.string().describe('Arrival date and time'),
    reservationNumber: z.string().optional().describe('Reservation number if applicable'),
    price: z.string().optional().describe('Price of transport'),
    url: z.string().optional().describe('URL for booking details'),
    notes: z.string().optional().describe('Additional notes'),
    userId: z.string().uuid().describe('User ID'),
    listId: z.string().uuid().optional().describe('Optional list ID to associate with transport'),
  }),
  execute: async (params) => {
    try {
      const transportData = await db
        .insert(transport)
        .values({
          id: crypto.randomUUID(),
          ...params,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning()

      return { success: true, transport: transportData[0] }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const get_transports = tool({
  description: 'Get transport records for a user',
  parameters: z.object({
    userId: z.string().uuid().describe('User ID'),
    listId: z.string().uuid().optional().describe('Optional list ID to filter transport'),
  }),
  execute: async ({ userId, listId }) => {
    try {
      const transports = await db
        .select()
        .from(transport)
        .where(and(eq(transport.userId, userId), listId ? eq(transport.listId, listId) : undefined))
        .orderBy(transport.departureTime)

      return { success: true, transports }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const update_transport = tool({
  description: 'Update a transport record',
  parameters: z.object({
    id: z.string().uuid().describe('Transport ID'),
    type: z.string().optional().describe('Type of transport (taxi, train, bus, etc.)'),
    departureLocation: z.string().optional().describe('Departure location'),
    arrivalLocation: z.string().optional().describe('Arrival location'),
    departureTime: z.string().optional().describe('Departure date and time'),
    arrivalTime: z.string().optional().describe('Arrival date and time'),
    reservationNumber: z.string().optional().describe('Reservation number if applicable'),
    price: z.string().optional().describe('Price of transport'),
    url: z.string().optional().describe('URL for booking details'),
    notes: z.string().optional().describe('Additional notes'),
    listId: z.string().uuid().optional().describe('Optional list ID'),
  }),
  execute: async ({ id, ...params }) => {
    try {
      const updatedTransport = await db
        .update(transport)
        .set({
          ...params,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(transport.id, id))
        .returning()

      if (updatedTransport.length === 0) {
        return { success: false, error: 'Transport record not found' }
      }

      return { success: true, transport: updatedTransport[0] }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const delete_transport = tool({
  description: 'Delete a transport record',
  parameters: z.object({
    id: z.string().uuid().describe('Transport ID to delete'),
  }),
  execute: async ({ id }) => {
    try {
      const deletedTransport = await db.delete(transport).where(eq(transport.id, id)).returning()

      if (deletedTransport.length === 0) {
        return { success: false, error: 'Transport record not found' }
      }

      return { success: true, message: 'Transport record deleted successfully' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const create_activity = tool({
  description: 'Create a new activity record (tour, attraction, event, etc.)',
  parameters: z.object({
    name: z.string().describe('Name of the activity'),
    location: z.string().describe('Location of the activity'),
    startTime: z.string().describe('Start date and time'),
    endTime: z.string().describe('End date and time'),
    bookingReference: z.string().optional().describe('Booking reference if applicable'),
    price: z.string().optional().describe('Price of activity'),
    url: z.string().optional().describe('URL for booking details'),
    notes: z.string().optional().describe('Additional notes'),
    userId: z.string().uuid().describe('User ID'),
    listId: z.string().uuid().optional().describe('Optional list ID to associate with activity'),
  }),
  execute: async (params) => {
    try {
      const activityData = await db
        .insert(activity)
        .values({
          id: crypto.randomUUID(),
          ...params,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning()

      return { success: true, activity: activityData[0] }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const get_activities = tool({
  description: 'Get activity records for a user',
  parameters: z.object({
    userId: z.string().uuid().describe('User ID'),
    listId: z.string().uuid().optional().describe('Optional list ID to filter activities'),
  }),
  execute: async ({ userId, listId }) => {
    try {
      const activities = await db
        .select()
        .from(activity)
        .where(and(eq(activity.userId, userId), listId ? eq(activity.listId, listId) : undefined))
        .orderBy(activity.startTime)

      return { success: true, activities }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const update_activity = tool({
  description: 'Update an activity record',
  parameters: z.object({
    id: z.string().uuid().describe('Activity ID'),
    name: z.string().optional().describe('Name of the activity'),
    location: z.string().optional().describe('Location of the activity'),
    startTime: z.string().optional().describe('Start date and time'),
    endTime: z.string().optional().describe('End date and time'),
    bookingReference: z.string().optional().describe('Booking reference if applicable'),
    price: z.string().optional().describe('Price of activity'),
    url: z.string().optional().describe('URL for booking details'),
    notes: z.string().optional().describe('Additional notes'),
    listId: z.string().uuid().optional().describe('Optional list ID'),
  }),
  execute: async ({ id, ...params }) => {
    try {
      const updatedActivity = await db
        .update(activity)
        .set({
          ...params,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(activity.id, id))
        .returning()

      if (updatedActivity.length === 0) {
        return { success: false, error: 'Activity record not found' }
      }

      return { success: true, activity: updatedActivity[0] }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export const delete_activity = tool({
  description: 'Delete an activity record',
  parameters: z.object({
    id: z.string().uuid().describe('Activity ID to delete'),
  }),
  execute: async ({ id }) => {
    try {
      const deletedActivity = await db.delete(activity).where(eq(activity.id, id)).returning()

      if (deletedActivity.length === 0) {
        return { success: false, error: 'Activity record not found' }
      }

      return { success: true, message: 'Activity record deleted successfully' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  },
})

export interface TripCost {
  type: 'transportation' | 'accommodation'
  cost: number
}

export const calculate_trip_costs = tool({
  description:
    'Calculate the costs for a trip, including transportation and accommodation if needed',
  parameters: z.object({
    needsTransportation: z.boolean().describe('Whether transportation is needed'),
    needsAccommodation: z.boolean().describe('Whether accommodation is needed'),
    origin: z.string().describe('Starting location'),
    destination: z.string().describe('Destination location'),
    method: z.enum(['car', 'bus', 'train', 'plane']).describe('Transportation method'),
    location: z.string().describe('Location for accommodation'),
  }),
  async execute({
    needsTransportation,
    needsAccommodation,
    origin,
    destination,
    method,
    location,
  }) {
    const results: TripCost[] = []

    if (needsTransportation) {
      const transportationCost = await calculate_transportation_costs.execute(
        {
          origin,
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
    origin: z.string().describe('Starting location'),
    destination: z.string().describe('Destination location'),
    method: z.enum(['car', 'bus', 'train', 'plane']).describe('Transportation method'),
  }),
  async execute({ origin, destination, method }) {
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
        cost = await get_historical_flight_data
          .execute({ origin, destination }, { messages: [], toolCallId: 'historical_flight_data' })
          .then((data) => {
            // Calculate average price from historical data
            const prices = data.chart_data.map((item) => Number.parseFloat(item.price))
            return prices.reduce((total, price) => total + price, 0) / prices.length
          })
        break
    }

    return new Promise<TripCost>((resolve) => {
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

export interface HistoricalFlightData {
  airportname: string
  chart_data: { year: string; price: string }[]
}

export const get_historical_flight_data = tool({
  description: 'Get historical flight price data between airports',
  parameters: z.object({
    origin: z.string().describe('The airport code of the start location (LAX, JFK, etc.).'),
    destination: z.string().describe('The airport code of the destination (LAX, JFK, etc.).'),
  }),
  async execute({ origin, destination }) {
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
      body: new URLSearchParams({ arrival: destination, departure: origin }).toString(),
      method: 'POST',
    })

    const body = (await response.json()) as HistoricalFlightData

    return body
  },
})
