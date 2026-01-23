import type { HonoClient } from '@hominem/hono-client';
import type { HonoMutationOptions } from '@hominem/hono-client/react';
import type {
  AdminRefreshGooglePlacesInput,
  AdminRefreshGooglePlacesOutput,
} from '@hominem/hono-rpc/types';
import type { ApiResult } from '@hominem/services';

import { useHonoMutation } from '@hominem/hono-client/react';

/**
 * Refresh Google Places data
 */
export const useRefreshGooglePlaces = (
  options?: HonoMutationOptions<AdminRefreshGooglePlacesOutput, AdminRefreshGooglePlacesInput>,
) => {
  return useHonoMutation<AdminRefreshGooglePlacesOutput, AdminRefreshGooglePlacesInput>(
    async (client: HonoClient, variables: AdminRefreshGooglePlacesInput) => {
      const res = await client.api.admin['refresh-google-places'].$post({ json: variables });
      const result = await res.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error?.message || 'Unknown error');
      }
    },
    options,
  );
};
