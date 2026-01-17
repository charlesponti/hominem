import { describe, expect, it } from 'vitest';
import { createPlaceFromPrediction } from '../places';
import type { GooglePlacePrediction } from '../types';

describe('createPlaceFromPrediction', () => {
  it('uses address as address if available', async () => {
    const prediction: GooglePlacePrediction = {
      place_id: 'test-id',
      text: 'Test Place',
      address: 'Test Address',
      location: null,
    };

    const place = await createPlaceFromPrediction(prediction);

    expect(place.name).toBe('Test Place');
    expect(place.address).toBe('Test Address');
  });

  it('falls back to empty string for address if address is missing', async () => {
    const prediction: GooglePlacePrediction = {
      place_id: 'test-id',
      text: 'Test Place',
      address: '',
      location: null,
    };

    const place = await createPlaceFromPrediction(prediction);

    expect(place.name).toBe('Test Place');
    expect(place.address).toBe('');
  });
});
