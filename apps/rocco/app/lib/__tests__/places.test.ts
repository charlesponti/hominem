import { describe, expect, it } from 'vitest'
import { createPlaceFromPrediction } from '../places'
import type { GooglePlacePrediction } from '../types'

describe('createPlaceFromPrediction', () => {
  it('uses structured_formatting.secondary_text as address if available', async () => {
    const prediction: GooglePlacePrediction = {
      place_id: 'test-id',
      description: 'Test Place, Test Address',
      structured_formatting: {
        main_text: 'Test Place',
        secondary_text: 'Test Address',
      },
      location: null,
    }

    const place = await createPlaceFromPrediction(prediction)

    expect(place.name).toBe('Test Place')
    expect(place.address).toBe('Test Address')
  })

  it('falls back to description for address if secondary_text is missing', async () => {
    const prediction: GooglePlacePrediction = {
      place_id: 'test-id',
      description: 'Test Place, Test Address',
      structured_formatting: {
        main_text: 'Test Place',
        secondary_text: '',
      },
      location: null,
    }

    const place = await createPlaceFromPrediction(prediction)

    expect(place.name).toBe('Test Place')
    expect(place.address).toBe('Test Place, Test Address')
  })
})
