import { getInvitesForUser, getListInvites } from '@hominem/lists-services';
import type { ListInviteOutput, ListOutput, UserOutput } from '@hominem/lists-services';

export type SentInvite = ListInviteOutput & {
  list: ListOutput | null;
  user_invitedUserId: UserOutput | null;
};
export type ReceivedInvite = ListInviteOutput & {
  list: ListOutput | null;
  belongsToAnotherUser?: boolean;
};

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
