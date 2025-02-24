import { logger } from '@ponti/utils/logger'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '../db'
import { venues } from '../db/schema'

export async function removeDuplicateVenues() {
  // Find duplicates based on title and address
  const duplicates = await db
    .select({
      title: venues.title,
      address: venues.address,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(venues)
    .groupBy(venues.title, venues.address)
    .having(sql`count(*) > 1`)

  let totalDeleted = 0

  for (const dup of duplicates) {
    // Get all matching venues ordered by creation date
    const matches = await db
      .select()
      .from(venues)
      .where(sql`${venues.title} = ${dup.title} AND ${venues.address} = ${dup.address}`)
      .orderBy(desc(venues.createdAt))

    // Keep the newest one, delete the rest
    const [keep, ...toDelete] = matches
    const deleteIds = toDelete.map((v) => v.id)

    if (deleteIds.length > 0) {
      const result = await db.delete(venues).where(sql`${venues.id} = ANY(${deleteIds})`)

      totalDeleted += deleteIds.length
    }
  }

  return totalDeleted
}

removeDuplicateVenues().then((count) => {
  logger.info(`Removed ${count} duplicate venues`)
  process.exit(0)
})
