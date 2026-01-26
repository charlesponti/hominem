import type { HonoMutationOptions } from '@hominem/hono-client/react';
import type {
  AdminRefreshGooglePlacesInput,
  AdminRefreshGooglePlacesOutput,
} from '@hominem/hono-rpc/types';

import { useHonoMutation } from '@hominem/hono-client/react';

/**
 * Refresh Google Places data
 */
export const useRefreshGooglePlaces = (
  options?: HonoMutationOptions<AdminRefreshGooglePlacesOutput, AdminRefreshGooglePlacesInput>,
) => {
  return useHonoMutation(
    async (client, variables: AdminRefreshGooglePlacesInput) => {
      const res = await client.api.admin['refresh-google-places'].$post({ json: variables });
      const result = await res.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    },
    options,
  );
};
