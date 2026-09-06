import type { InferRequestType, InferResponseType } from 'hono/client';

import type { HonoClient } from '../core/api-client';

// ============================================================================
// LIST / CREATE
// ============================================================================

type _CollectionsListEndpoint = HonoClient['api']['collections']['$get'];
export type ListCollectionsOutput = InferResponseType<_CollectionsListEndpoint, 200>;
export type CollectionSummary = ListCollectionsOutput['collections'][number];

type _CollectionsCreateEndpoint = HonoClient['api']['collections']['$post'];
export type CreateCollectionInput = InferRequestType<_CollectionsCreateEndpoint>['json'];
export type CreateCollectionOutput = InferResponseType<_CollectionsCreateEndpoint, 200>;

// ============================================================================
// DETAIL / UPDATE / DELETE
// ============================================================================

type _CollectionDetailEndpoint = HonoClient['api']['collections'][':collectionId']['$get'];
export type CollectionDetailOutput = InferResponseType<_CollectionDetailEndpoint, 200>;
export type CollectionMember = CollectionDetailOutput['members'][number];
export type CollectionItem = CollectionDetailOutput['items'][number];

type _CollectionUpdateEndpoint = HonoClient['api']['collections'][':collectionId']['$patch'];
export type UpdateCollectionInput = InferRequestType<_CollectionUpdateEndpoint>['json'];
export type UpdateCollectionOutput = InferResponseType<_CollectionUpdateEndpoint, 200>;

type _CollectionDeleteEndpoint = HonoClient['api']['collections'][':collectionId']['$delete'];
export type DeleteCollectionOutput = InferResponseType<_CollectionDeleteEndpoint, 200>;

type _CollectionLeaveEndpoint = HonoClient['api']['collections'][':collectionId']['leave']['$post'];
export type LeaveCollectionOutput = InferResponseType<_CollectionLeaveEndpoint, 200>;

// ============================================================================
// ITEMS
// ============================================================================

type _CollectionItemRemoveEndpoint =
  HonoClient['api']['collections'][':collectionId']['items'][':entityType'][':entityId']['$delete'];
export type RemoveCollectionItemOutput = InferResponseType<_CollectionItemRemoveEndpoint, 200>;

// ============================================================================
// MEMBERS
// ============================================================================

type _MemberInviteEndpoint = HonoClient['api']['collections'][':collectionId']['members']['$post'];
export type InviteMemberInput = InferRequestType<_MemberInviteEndpoint>['json'];
export type InviteMemberOutput = InferResponseType<_MemberInviteEndpoint, 200>;

type _MemberRoleUpdateEndpoint =
  HonoClient['api']['collections'][':collectionId']['members'][':memberId']['$patch'];
export type UpdateMemberRoleInput = InferRequestType<_MemberRoleUpdateEndpoint>['json'];
export type UpdateMemberRoleOutput = InferResponseType<_MemberRoleUpdateEndpoint, 200>;

type _MemberRemoveEndpoint =
  HonoClient['api']['collections'][':collectionId']['members'][':memberId']['$delete'];
export type RemoveMemberOutput = InferResponseType<_MemberRemoveEndpoint, 200>;

// ============================================================================
// INVITES (pending, accept, decline)
// ============================================================================

type _PendingInvitesEndpoint = HonoClient['api']['collections']['invites']['$get'];
export type ListPendingCollectionInvitesOutput = InferResponseType<_PendingInvitesEndpoint, 200>;
export type PendingCollectionInvite = ListPendingCollectionInvitesOutput['invites'][number];

type _AcceptInviteEndpoint =
  HonoClient['api']['collections']['invites'][':collectionId']['accept']['$post'];
export type AcceptCollectionInviteOutput = InferResponseType<_AcceptInviteEndpoint, 200>;

type _DeclineInviteEndpoint =
  HonoClient['api']['collections']['invites'][':collectionId']['decline']['$post'];
export type DeclineCollectionInviteOutput = InferResponseType<_DeclineInviteEndpoint, 200>;
