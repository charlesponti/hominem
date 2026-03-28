import type { ListOutput } from './contracts';

export interface ListInviteOutput {
  id: string;
  listId: string;
  userId: string;
  invitedUserEmail: string;
  invitedUserId: string | null;
  accepted: boolean;
  token: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserOutput {
  id: string;
  email: string;
  name: string | null;
}

export type SendListInviteParams = {
  listId: string;
  invitedUserEmail: string;
  invitingUserId: string;
  baseUrl: string;
};

export type AcceptListInviteParams = {
  listId: string;
  acceptingUserId: string;
  token: string;
};

export type DeleteListInviteParams = {
  listId: string;
  invitedUserEmail: string;
  userId: string;
};

export async function getListInvites(
  _listId: string,
): Promise<
  (ListInviteOutput & { list: ListOutput | null; user_invitedUserId: UserOutput | null })[]
> {
  return [];
}

export async function getInvitesForUser(
  _userId: string,
  _normalizedEmail?: string | null,
): Promise<(ListInviteOutput & { list: ListOutput | null })[]> {
  return [];
}

export async function getInviteByToken(
  token: string,
): Promise<ListInviteOutput & { list: ListOutput | null }> {
  // Keep behavior predictable until we finish the full schema rewrite.
  return {
    id: token,
    listId: token,
    userId: token,
    invitedUserEmail: '',
    invitedUserId: null,
    accepted: false,
    token,
    acceptedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    list: null,
  };
}

export async function getOutboundInvites(
  _userId: string,
): Promise<(ListInviteOutput & { list: ListOutput; user_invitedUserId: UserOutput | null })[]> {
  return [];
}

export async function sendListInvite(_params: SendListInviteParams): Promise<ListInviteOutput> {
  throw new Error('Not implemented');
}

export async function acceptListInvite(_params: AcceptListInviteParams): Promise<ListOutput> {
  throw new Error('Not implemented');
}

export async function deleteListInvite(_params: DeleteListInviteParams): Promise<void> {
  // no-op
}

export async function getInviteByListAndToken(params: {
  listId: string;
  token: string;
}): Promise<(ListInviteOutput & { list: ListOutput | null }) | null> {
  const invite = await getInviteByToken(params.token);

  if (!invite || invite.listId !== params.listId) {
    return null;
  }

  return invite;
}

export async function deleteInviteByListAndToken(params: {
  listId: string;
  token: string;
}): Promise<boolean> {
  const invite = await getInviteByListAndToken(params);

  if (!invite) {
    return false;
  }

  return true;
}
