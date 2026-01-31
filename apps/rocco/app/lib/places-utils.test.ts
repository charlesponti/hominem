import { describe, expect, it } from 'vitest';

import type { GooglePlaceDetailsResponse } from './types';

import {
  extractPhotoReferences,
  mapGooglePlaceToPrediction,
  parsePriceLevel,
  transformGooglePlaceToPlaceInsert,
} from './places-utils';

describe('places-utils', () => {
  describe('extractPhotoReferences', () => {
    it('should return empty array if photos is undefined', () => {
      expect(extractPhotoReferences(undefined)).toEqual([]);
    });

    it('should extract photo names', () => {
      const photos = [
        { name: 'photo1', widthPx: 100, heightPx: 100, authorAttributions: [] },
        { name: 'photo2', widthPx: 100, heightPx: 100, authorAttributions: [] },
      ];
      expect(extractPhotoReferences(photos)).toEqual(['photo1', 'photo2']);
    });

    it('should filter out invalid names', () => {
      const photos = [
        { name: 'photo1', widthPx: 100, heightPx: 100, authorAttributions: [] },
        { name: '', widthPx: 100, heightPx: 100, authorAttributions: [] },
        { name: null, widthPx: 100, heightPx: 100, authorAttributions: [] },
      ];
      expect(extractPhotoReferences(photos)).toEqual(['photo1']);
    });
  });

  describe('parsePriceLevel', () => {
    it('should return null for null or undefined', () => {
      expect(parsePriceLevel(null)).toBeNull();
      expect(parsePriceLevel(undefined)).toBeNull();
    });

    it('should return number if input is number', () => {
      expect(parsePriceLevel(1)).toBe(1);
    });

    it('should parse price level strings', () => {
      expect(parsePriceLevel('PRICE_LEVEL_FREE')).toBe(0);
      expect(parsePriceLevel('PRICE_LEVEL_INEXPENSIVE')).toBe(1);
      expect(parsePriceLevel('PRICE_LEVEL_MODERATE')).toBe(2);
      expect(parsePriceLevel('PRICE_LEVEL_EXPENSIVE')).toBe(3);
      expect(parsePriceLevel('PRICE_LEVEL_VERY_EXPENSIVE')).toBe(4);
    });

    it('should return null for unknown strings', () => {
      expect(parsePriceLevel('UNKNOWN_LEVEL')).toBeNull();
    });
  });

  describe('mapGooglePlaceToPrediction', () => {
    it('should map google place response to prediction', () => {
      const placeResult = {
        id: 'place123',
        displayName: { text: 'My Place', languageCode: 'en' },
        formattedAddress: '123 Main St',
        location: { latitude: 10, longitude: 20 },
        priceLevel: 'PRICE_LEVEL_MODERATE',
      };
      const result = mapGooglePlaceToPrediction(placeResult);

      expect(result).toEqual({
        place_id: 'place123',
        text: 'My Place',
        address: '123 Main St',
        location: {
          latitude: 10,
          longitude: 20,
        },
        priceLevel: 'PRICE_LEVEL_MODERATE',
      });
    });

    it('should handle missing display name', () => {
      const placeResult = {
        id: 'place123',
        formattedAddress: '123 Main St',
      };
      const result = mapGooglePlaceToPrediction(placeResult);
      expect(result.text).toBe('');
    });

    it('should handle missing address', () => {
      const placeResult = {
        id: 'place123',
        displayName: { text: 'My Place', languageCode: 'en' },
      };
      const result = mapGooglePlaceToPrediction(placeResult);
      expect(result.address).toBe('');
    });
  });

  describe('transformGooglePlaceToPlaceInsert', () => {
    it('should transform a complete Google Place to PlaceInsert', () => {
      const googlePlace: GooglePlaceDetailsResponse = {
        displayName: { text: 'Test Place', languageCode: 'en' },
        formattedAddress: '123 Test St',
        location: { latitude: 45, longitude: -122 },
        types: ['restaurant', 'food'],
        rating: 4.5,
        websiteUri: 'https://example.com',
        nationalPhoneNumber: '+1 555-0199',
        priceLevel: 'PRICE_LEVEL_MODERATE',
        photos: [
          { name: 'places/123/photos/abc', widthPx: 100, heightPx: 100, authorAttributions: [] },
          { name: 'places/123/photos/def', widthPx: 100, heightPx: 100, authorAttributions: [] },
        ],
      };

      const result = transformGooglePlaceToPlaceInsert(googlePlace, 'google-id-123');

      expect(result).toEqual({
        googleMapsId: 'google-id-123',
        name: 'Test Place',
        address: '123 Test St',
        latitude: 45,
        longitude: -122,
        location: [-122, 45], // [longitude, latitude]
        types: ['restaurant', 'food'],
        rating: 4.5,
        websiteUri: 'https://example.com',
        phoneNumber: '+1 555-0199',
        priceLevel: 2,
        photos: ['places/123/photos/abc', 'places/123/photos/def'],
        imageUrl: null,
      });
    });

    it('should handle missing optional fields', () => {
      const googlePlace: GooglePlaceDetailsResponse = {
        displayName: { text: 'Minimal Place', languageCode: 'en' },
      };

      const result = transformGooglePlaceToPlaceInsert(googlePlace, 'min-id');

      expect(result).toMatchObject({
        googleMapsId: 'min-id',
        name: 'Minimal Place',
        address: null,
        latitude: null,
        longitude: null,
        photos: null,
      });
    });

    it('should sanitize photos during transformation', () => {
      const googlePlace: GooglePlaceDetailsResponse = {
        displayName: { text: 'Sanitized Place', languageCode: 'en' },
        photos: [
          { name: 'places/123/photos/abc', widthPx: 100, heightPx: 100, authorAttributions: [] },
          { name: '', widthPx: 100, heightPx: 100, authorAttributions: [] },
        ],
      };

      const result = transformGooglePlaceToPlaceInsert(googlePlace, 'san-id');
      expect(result.photos).toEqual(['places/123/photos/abc']);
    });
  });
});
