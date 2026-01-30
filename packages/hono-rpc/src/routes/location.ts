import { formatGeocodeFeatures, type Geocoding, LAYERS } from '@hominem/utils/location';
import { ValidationError, InternalError } from '@hominem/services';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

export const locationRoutes = new Hono<AppContext>()
  // Geocode location
  .get('/geocode', authMiddleware, async (c) => {
    try {
      const query = c.req.query('query');

      if (!query || query.length === 0) {
        throw new ValidationError('Query parameter is required');
      }

      const { GEOCODE_EARTH_API_KEY } = process.env;

      if (!GEOCODE_EARTH_API_KEY) {
        console.error('Missing GEOCODE_EARTH_API_KEY environment variable');
        throw new InternalError('Geocoding service not configured');
      }

      const searchParams = new URLSearchParams({
        api_key: GEOCODE_EARTH_API_KEY,
        layers: LAYERS.join(','),
        'boundary.country': 'USA',
        text: query,
      });

      const response = await fetch(
        `https://api.geocode.earth/v1/autocomplete?${searchParams.toString()}`,
      );

      if (!response.ok) {
        console.error(`Geocoding API error: ${response.status} ${response.statusText}`);
        throw new InternalError('Error fetching location data');
      }

      const results = (await response.json()) as Geocoding;
      return c.json(formatGeocodeFeatures(results));
    } catch (err) {
      console.error('[location.geocode] error:', err);
      throw new InternalError(`Error fetching city lat/lng: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
