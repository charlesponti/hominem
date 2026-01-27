import type { ListInviteSelect as ListInvite, ListSelect, UserSelect } from '@hominem/db/schema';

import { getInvitesForUser, getListInvites } from '@hominem/lists-services';

export type SentInvite = ListInvite & { list: ListSelect | null; user_invitedUserId: UserSelect | null };
export type ReceivedInvite = ListInvite & { list: ListSelect | null; belongsToAnotherUser?: boolean };

export const invitesService = {
  getByList: ({ listId }: { listId: string }) => getListInvites(listId),
  getReceived: async (userId: string, options?: { token?: string }) => {
    const invites = await getInvitesForUser(userId);
    const result = options?.token
      ? invites.filter((invite) => invite.token === options.token)
      : invites;
    return result.map((invite) => ({
      ...invite,
      belongsToAnotherUser: invite.invitedUserId !== userId,
    }));
  },
};
