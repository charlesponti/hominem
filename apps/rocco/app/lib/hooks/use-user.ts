import type { HonoClient } from '@hominem/hono-client';
import type { HonoMutationOptions } from '@hominem/hono-client/react';
import type { UserDeleteAccountOutput } from '@hominem/hono-rpc/types/user.types';

import { useHonoMutation, useHonoUtils } from '@hominem/hono-client/react';

import { queryKeys } from '~/lib/query-keys';

/**
 * Delete user account
 */
export const useDeleteAccount = (options?: HonoMutationOptions<UserDeleteAccountOutput, {}>) => {
  const utils = useHonoUtils();
  return useHonoMutation<UserDeleteAccountOutput, {}>(
    async (client: HonoClient) => {
      const res = await client.api.user['delete-account'].$post({ json: {} });
      return (await res.json()) as unknown as UserDeleteAccountOutput;
    },
    {
      ...options,
      onMutate: async () => {
        await utils.cancel(queryKeys.lists.all());
        await utils.cancel(queryKeys.places.all());
        await utils.cancel(queryKeys.trips.all());
        await utils.cancel(queryKeys.people.list());
        await utils.cancel(queryKeys.invites.sent());
        await utils.cancel(queryKeys.invites.received());

        const previousLists = utils.getData(queryKeys.lists.all());
        const previousPlaces = utils.getData(queryKeys.places.all());
        const previousTrips = utils.getData(queryKeys.trips.all());
        const previousPeople = utils.getData(queryKeys.people.list());
        const previousInvitesSent = utils.getData(queryKeys.invites.sent());
        const previousInvitesReceived = utils.getData(queryKeys.invites.received());

        utils.setData(queryKeys.lists.all(), []);
        utils.setData(queryKeys.places.all(), []);
        utils.setData(queryKeys.trips.all(), []);
        utils.setData(queryKeys.people.list(), []);
        utils.setData(queryKeys.invites.sent(), []);
        utils.setData(queryKeys.invites.received(), []);

        return {
          previousLists,
          previousPlaces,
          previousTrips,
          previousPeople,
          previousInvitesSent,
          previousInvitesReceived,
        };
      },
      onError: (error, _variables, context, mutationContext) => {
        if (context && typeof context === 'object') {
          if ('previousLists' in context) {
            utils.setData(queryKeys.lists.all(), (context as { previousLists?: unknown }).previousLists);
          }
          if ('previousPlaces' in context) {
            utils.setData(queryKeys.places.all(), (context as { previousPlaces?: unknown }).previousPlaces);
          }
          if ('previousTrips' in context) {
            utils.setData(queryKeys.trips.all(), (context as { previousTrips?: unknown }).previousTrips);
          }
          if ('previousPeople' in context) {
            utils.setData(queryKeys.people.list(), (context as { previousPeople?: unknown }).previousPeople);
          }
          if ('previousInvitesSent' in context) {
            utils.setData(queryKeys.invites.sent(), (context as { previousInvitesSent?: unknown }).previousInvitesSent);
          }
          if ('previousInvitesReceived' in context) {
            utils.setData(queryKeys.invites.received(), (context as { previousInvitesReceived?: unknown }).previousInvitesReceived);
          }
        }

        options?.onError?.(error, _variables, context, mutationContext);
      },
      onSuccess: (result, variables, context, mutationContext) => {
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      onSettled: () => {
        utils.invalidate(queryKeys.lists.all());
        utils.invalidate(queryKeys.places.all());
        utils.invalidate(queryKeys.trips.all());
        utils.invalidate(queryKeys.people.list());
        utils.invalidate(queryKeys.invites.sent());
        utils.invalidate(queryKeys.invites.received());
      },
    },
  );
};
