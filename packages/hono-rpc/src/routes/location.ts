import { formatGeocodeFeatures, type Geocoding, LAYERS } from '@hominem/utils/location';
import { error, success } from '@hominem/services';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

export const locationRoutes = new Hono<AppContext>()
  // Geocode location
  .get('/geocode', authMiddleware, async (c) => {
    try {
      const query = c.req.query('query');

      if (!query || query.length === 0) {
        return c.json(error('VALIDATION_ERROR', 'Query parameter is required'), 400);
      }

      const { GEOCODE_EARTH_API_KEY } = process.env;

      if (!GEOCODE_EARTH_API_KEY) {
        console.error('Missing GEOCODE_EARTH_API_KEY environment variable');
        return c.json(error('INTERNAL_ERROR', 'Geocoding service not configured'), 500);
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
        return c.json(error('INTERNAL_ERROR', 'Error fetching location data'), 500);
      }

      const results = (await response.json()) as Geocoding;
      return c.json(success(formatGeocodeFeatures(results)));
    } catch (err) {
      console.error('[location.geocode] error:', err);
      return c.json(
        error(
          'INTERNAL_ERROR',
          `Error fetching city lat/lng: ${err instanceof Error ? err.message : String(err)}`,
        ),
        500,
      );
    }
  });
