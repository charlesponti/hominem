import { db } from '@hominem/db';

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

import type * as zod from 'zod';

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

// Explicit re-exports for existing callers.
// Schemas were backed by zod previously; remove for now.
// Callers should be updated once the invites feature is fully ported.
