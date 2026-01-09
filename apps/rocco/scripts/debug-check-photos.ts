import { db } from '@hominem/data/db'
import { place } from '@hominem/data/schema'
import { ilike } from 'drizzle-orm'

async function debug() {
  const p = await db.query.place.findFirst({
    where: ilike(place.name, '%La Colombe%'),
  })
  if (p) {
    console.log('Place:', p.name)
    console.log('Photos:', JSON.stringify(p.photos, null, 2))
  } else {
    console.log('Place not found')
  }
}

debug()
  .catch(console.error)
  .finally(() => process.exit())
