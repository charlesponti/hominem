import { logger } from '@hominem/utils/logger'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { item, place, tripItems, trips } from '../db/schema'

export async function createTrip(input: {
  name: string
  userId: string
  startDate?: Date
  endDate?: Date
}) {
  try {
    const [newTrip] = await db
      .insert(trips)
      .values({
        name: input.name,
        userId: input.userId,
        startDate: input.startDate,
        endDate: input.endDate,
      })
      .returning()
    return newTrip
  } catch (error) {
    logger.error(
      JSON.stringify(
        {
          message: 'Failed to create trip',
          service: 'trips.service',
          function: 'createTrip',
          userId: input.userId,
          input,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    )
    return null
  }
}

export async function getAllTrips(userId: string) {
  return db.select().from(trips).where(eq(trips.userId, userId))
}

export async function getTripById(tripId: string, userId: string) {
  const trip = await db.query.trips.findFirst({
    where: and(eq(trips.id, tripId), eq(trips.userId, userId)),
  })

  if (!trip) {
    return null
  }

  const items = await db
    .select()
    .from(tripItems)
    .where(eq(tripItems.tripId, tripId))
    .innerJoin(item, eq(tripItems.itemId, item.id))
    .innerJoin(place, eq(item.itemId, place.id))
    .orderBy(tripItems.day, tripItems.order)

  return { ...trip, items }
}

export async function addItemToTrip(input: {
  tripId: string
  itemId: string
  day?: number
  order?: number
}) {
  const [newTripItem] = await db
    .insert(tripItems)
    .values({
      tripId: input.tripId,
      itemId: input.itemId,
      day: input.day,
      order: input.order,
    })
    .returning()
  return newTripItem
}
