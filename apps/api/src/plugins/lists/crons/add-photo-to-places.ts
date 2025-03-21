/**
 * This cron job fetches the first photo of a place from the Google Places API
 * and updates the place with the photo URL.
 */

import { db } from '@ponti/utils/db'
import logger from '@ponti/utils/logger'
import { place } from '@ponti/utils/schema'
import { eq } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { getPlacePhotos, isValidImageUrl } from '../../google/places'

async function addPhotoToPlaces(server: FastifyInstance) {
  let count = 0
  const places = await db.select().from(place)

  if (!places.length) {
    return
  }

  for (const p of places) {
    // Skip places that already have a valid image
    if (p.imageUrl && isValidImageUrl(p.imageUrl)) {
      logger.info('Place already has a valid image', { id: p.id })
      continue
    }

    // Skip places that don't have a googleMapsId
    if (!p.googleMapsId) {
      continue
    }

    const media = await getPlacePhotos({
      googleMapsId: p.googleMapsId,
      limit: 1,
    })

    if (!media) {
      console.error('Error fetching photo for place', { id: p.id })
      continue
    }

    const { imageUrl } = media[0]

    if (!imageUrl) {
      console.error('No photoUri found for place', { id: p.id })
      continue
    }

    if (!isValidImageUrl(imageUrl)) {
      console.error('Invalid photoUri found for place', {
        id: p.id,
        imageUrl,
      })
      continue
    }

    if (isValidImageUrl(imageUrl)) {
      await db.update(place).set({ imageUrl }).where(eq(place.id, place.id))
      count += 1
    }
  }

  // Send email to admin
  server.sendEmail(
    process.env.SENDGRID_SENDER_EMAIL as string,
    'All places have been updated with photos',
    'All places have been updated with photos',
    `<p>${count} places have been updated with valid image URLs</p>`
  )
}

export default addPhotoToPlaces
