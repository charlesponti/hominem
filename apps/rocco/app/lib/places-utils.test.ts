import { describe, expect, it } from 'vitest'
import {
  extractPhotoReferences,
  mapGooglePlaceToPrediction,
  parsePriceLevel,
  sanitizeStoredPhotos,
} from './places-utils'

describe('places-utils', () => {
  describe('extractPhotoReferences', () => {
    it('should return empty array if photos is undefined', () => {
      expect(extractPhotoReferences(undefined)).toEqual([])
    })

    it('should extract photo names', () => {
      const photos = [
        { name: 'photo1', widthPx: 100, heightPx: 100, authorAttributions: [] },
        { name: 'photo2', widthPx: 100, heightPx: 100, authorAttributions: [] },
      ]
      expect(extractPhotoReferences(photos)).toEqual(['photo1', 'photo2'])
    })

    it('should filter out invalid names', () => {
      const photos = [
        { name: 'photo1', widthPx: 100, heightPx: 100, authorAttributions: [] },
        { name: '', widthPx: 100, heightPx: 100, authorAttributions: [] },
        { name: null, widthPx: 100, heightPx: 100, authorAttributions: [] },
      ]
      expect(extractPhotoReferences(photos)).toEqual(['photo1'])
    })
  })

  describe('sanitizeStoredPhotos', () => {
    it('should return empty array if input is not an array', () => {
      expect(sanitizeStoredPhotos(null)).toEqual([])
      expect(sanitizeStoredPhotos(undefined)).toEqual([])
    })

    it('should filter out non-string or empty string values', () => {
      const photos = ['photo1', '', 'photo2']
      expect(sanitizeStoredPhotos(photos)).toEqual(['photo1', 'photo2'])
    })
  })

  describe('parsePriceLevel', () => {
    it('should return null for null or undefined', () => {
      expect(parsePriceLevel(null)).toBeNull()
      expect(parsePriceLevel(undefined)).toBeNull()
    })

    it('should return number if input is number', () => {
      expect(parsePriceLevel(1)).toBe(1)
    })

    it('should parse price level strings', () => {
      expect(parsePriceLevel('PRICE_LEVEL_FREE')).toBe(0)
      expect(parsePriceLevel('PRICE_LEVEL_INEXPENSIVE')).toBe(1)
      expect(parsePriceLevel('PRICE_LEVEL_MODERATE')).toBe(2)
      expect(parsePriceLevel('PRICE_LEVEL_EXPENSIVE')).toBe(3)
      expect(parsePriceLevel('PRICE_LEVEL_VERY_EXPENSIVE')).toBe(4)
    })

    it('should return null for unknown strings', () => {
      expect(parsePriceLevel('UNKNOWN_LEVEL')).toBeNull()
    })
  })

  describe('mapGooglePlaceToPrediction', () => {
    it('should map google place response to prediction', () => {
      const placeResult = {
        id: 'place123',
        displayName: { text: 'My Place', languageCode: 'en' },
        formattedAddress: '123 Main St',
        location: { latitude: 10, longitude: 20 },
        priceLevel: 'PRICE_LEVEL_MODERATE',
      }
      const result = mapGooglePlaceToPrediction(placeResult)

      expect(result).toEqual({
        place_id: 'place123',
        text: 'My Place',
        address: '123 Main St',
        location: {
          latitude: 10,
          longitude: 20,
        },
        priceLevel: 'PRICE_LEVEL_MODERATE',
      })
    })

    it('should handle missing display name', () => {
      const placeResult = {
        id: 'place123',
        formattedAddress: '123 Main St',
      }
      const result = mapGooglePlaceToPrediction(placeResult)
      expect(result.text).toBe('')
    })

    it('should handle missing address', () => {
      const placeResult = {
        id: 'place123',
        displayName: { text: 'My Place', languageCode: 'en' },
      }
      const result = mapGooglePlaceToPrediction(placeResult)
      expect(result.address).toBe('')
    })
  })
})
