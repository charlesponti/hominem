import { z } from 'zod';
import type { ApiResult } from '@hominem/services';
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
  list?: {
    id: string;
    name: string;
    ownerId?: string;
  };
  invitingUser?: {
    id: string;
    email: string | null;
    name?: string | null;
  };
  belongsToAnotherUser?: boolean;
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

export type InvitesGetReceivedOutput = ApiResult<Invite[]>;

// ============================================================================
// GET SENT INVITES
// ============================================================================

export type InvitesGetSentInput = EmptyInput;
export type InvitesGetSentOutput = ApiResult<Invite[]>;

// ============================================================================
// GET INVITES BY LIST
// ============================================================================

export type InvitesGetByListInput = {
  listId: string;
};

export const invitesGetByListSchema = z.object({
  listId: z.string().uuid(),
});

export type InvitesGetByListOutput = ApiResult<Invite[]>;

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

export type InvitesCreateOutput = ApiResult<Invite>;

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

export type InvitesAcceptOutput = ApiResult<Invite>;

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

export type InvitesDeclineOutput = ApiResult<{ success: boolean }>;

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

export type InvitesDeleteOutput = ApiResult<{ success: boolean }>;
