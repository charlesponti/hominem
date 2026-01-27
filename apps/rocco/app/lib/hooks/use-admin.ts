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
  return useHonoMutation<AdminRefreshGooglePlacesOutput, AdminRefreshGooglePlacesInput>(
    async (client, variables: AdminRefreshGooglePlacesInput) => {
      const res = await client.api.admin['refresh-google-places'].$post({ json: variables });
      return (await res.json()) as unknown as AdminRefreshGooglePlacesOutput;
    },
    options,
  );
};
