/**
 * Explicit Type Contracts for Invites API
 *
 * Performance Benefit: These explicit types are resolved INSTANTLY by TypeScript.
 * No complex inference, no router composition, no type instantiation explosion.
 */

/**
 * Utility type to convert Date fields to strings for JSON serialization
 * This matches the reality of HTTP responses where dates are ISO strings
 */
type JsonSerialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<JsonSerialized<U>>
    : T extends object
      ? { [K in keyof T]: JsonSerialized<T[K]> }
      : T;

export interface ListInvite {
  listId: string;
  invitedUserId: string | null;
  invitedUserEmail: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  accepted: boolean;
  acceptedAt: string | null;
  userId: string;
  list?: {
    id: string;
    name: string;
    userId: string;
  };
}

// ============================================================================
// Invites GetReceived
// ============================================================================

export interface InvitesGetReceivedInput {
  token?: string;
}

export type InvitesGetReceivedOutput = Array<
  ListInvite & {
    belongsToAnotherUser: boolean;
  }
>;

// ============================================================================
// Invites GetSent
// ============================================================================

export type InvitesGetSentOutput = ListInvite[];

// ============================================================================
// Invites GetByList
// ============================================================================

export interface InvitesGetByListInput {
  listId: string;
}

export type InvitesGetByListOutput = ListInvite[];

// ============================================================================
// Invites Create
// ============================================================================

export interface InvitesCreateInput {
  listId: string;
  invitedUserEmail: string;
}

export type InvitesCreateOutput = ListInvite;

// ============================================================================
// Invites Accept
// ============================================================================

export interface InvitesAcceptInput {
  listId: string;
  token: string;
}

export type InvitesAcceptOutput = ListInvite;

// ============================================================================
// Invites Decline
// ============================================================================

export interface InvitesDeclineInput {
  listId: string;
  token: string;
}

export interface InvitesDeclineOutput {
  success: boolean;
}

// ============================================================================
// Invites Delete
// ============================================================================

export interface InvitesDeleteInput {
  listId: string;
  invitedUserEmail: string;
}

export interface InvitesDeleteOutput {
  success: boolean;
}
