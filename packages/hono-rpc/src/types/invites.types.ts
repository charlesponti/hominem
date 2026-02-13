import * as z from 'zod';

import type { EmptyInput } from './utils';

// ============================================================================
// Data Types
// ============================================================================

export type Invite = {
  id: string;
  listId: string;
  invitingUserId: string;
  invitedUserId: string | null;
  invitedUserEmail: string | null;
  token: string;
  status: string; // 'pending' | 'accepted' | 'declined'
  createdAt: string;
  updatedAt: string;
  list?:
    | {
        id: string;
        name: string;
        ownerId?: string | undefined;
      }
    | undefined;
  invitingUser?:
    | {
        id: string;
        email: string | null;
        name?: string | null | undefined;
      }
    | undefined;
  belongsToAnotherUser?: boolean | undefined;
};

// ============================================================================
// GET RECEIVED INVITES
// ============================================================================

export type InvitesGetReceivedInput = {
  token?: string;
};

export const invitesGetReceivedSchema = z.object({
  token: z.string().optional(),
});

export type InvitesGetReceivedOutput = Invite[];

// ============================================================================
// GET SENT INVITES
// ============================================================================

export type InvitesGetSentInput = EmptyInput;
export type InvitesGetSentOutput = Invite[];

// ============================================================================
// GET INVITES BY LIST
// ============================================================================

export type InvitesGetByListInput = {
  listId: string;
};

export const invitesGetByListSchema = z.object({
  listId: z.string().uuid(),
});

export type InvitesGetByListOutput = Invite[];

// ============================================================================
// CREATE INVITE
// ============================================================================

export type InvitesCreateInput = {
  listId: string;
  invitedUserEmail: string;
};

export const invitesCreateSchema = z.object({
  listId: z.string().uuid(),
  invitedUserEmail: z.string().email(),
});

export type InvitesCreateOutput = Invite;

// ============================================================================
// ACCEPT INVITE
// ============================================================================

export type InvitesAcceptInput = {
  listId: string;
  token: string;
};

export const invitesAcceptSchema = z.object({
  listId: z.string().uuid(),
  token: z.string().min(1, 'Token is required'),
});

export type InvitesAcceptOutput = Invite;

// ============================================================================
// DECLINE INVITE
// ============================================================================

export type InvitesDeclineInput = {
  listId: string;
  token: string;
};

export const invitesDeclineSchema = z.object({
  listId: z.string().uuid(),
  token: z.string().min(1, 'Token is required'),
});

export type InvitesDeclineOutput = { success: boolean };

// ============================================================================
// DELETE INVITE
// ============================================================================

export type InvitesDeleteInput = {
  listId: string;
  invitedUserEmail: string;
};

export const invitesDeleteSchema = z.object({
  listId: z.string().uuid(),
  invitedUserEmail: z.string().email(),
});

export type InvitesDeleteOutput = { success: boolean };

// ============================================================================
// INVITE PREVIEW (PUBLIC)
// ============================================================================

export type InvitesPreviewInput = {
  token: string;
};

export const invitesPreviewSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type InvitesPreviewOutput = {
  listId?: string | undefined;
  listName: string;
  coverPhoto?: string | null | undefined;
  firstItemName?: string | null | undefined;
  invitedUserEmail?: string | null | undefined;
} | null;
