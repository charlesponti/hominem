import type { HonoMutationOptions } from '@hominem/hono-client/react';
import { useHonoMutation, useHonoUtils } from '@hominem/hono-client/react';
import type {
  AdminRefreshGooglePlacesInput,
  AdminRefreshGooglePlacesOutput,
} from '@hominem/hono-rpc/types/admin.types';

import { queryKeys } from '~/lib/query-keys';

/**
 * Refresh Google Places data
 */
export const useRefreshGooglePlaces = (
  options?: HonoMutationOptions<AdminRefreshGooglePlacesOutput, AdminRefreshGooglePlacesInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<AdminRefreshGooglePlacesOutput, AdminRefreshGooglePlacesInput>(
    ({ admin }, variables) => admin.refreshGooglePlaces(variables),
    {
      ...options,
      onMutate: async () => {
        await utils.cancel(queryKeys.places.all());
        const previousPlaces = utils.getData(queryKeys.places.all());
        return { previousPlaces };
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.places.all());
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      onError: (error, variables, context, mutationContext) => {
        if (context && typeof context === 'object' && 'previousPlaces' in context) {
          utils.setData(
            queryKeys.places.all(),
            (context as { previousPlaces: unknown }).previousPlaces,
          );
        }
        options?.onError?.(error, variables, context, mutationContext);
      },
      onSettled: () => {
        utils.invalidate(queryKeys.places.all());
      },
    },
  );
};
