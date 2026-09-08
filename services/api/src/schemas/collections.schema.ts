import { z } from 'zod';

import { entityTypeSchema } from './tags.schema';

const collectionSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(['private', 'shared']),
  itemCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const collectionMemberSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  userEmail: z.string().nullable(),
  invitedEmail: z.string().nullable(),
  role: z.enum(['owner', 'editor', 'viewer']),
  invitedAt: z.string(),
  acceptedAt: z.string().nullable(),
});

const collectionItemSchema = z.object({
  id: z.string(),
  entityType: entityTypeSchema,
  entityId: z.string(),
  entityName: z.string().nullable(),
  note: z.string().nullable(),
  sortOrder: z.number().int().nullable(),
  addedAt: z.string(),
});

const collectionDetailSchema = z.object({
  collection: collectionSummarySchema.nullable(),
  items: z.array(collectionItemSchema),
  members: z.array(collectionMemberSchema),
  viewerRole: z.enum(['owner', 'editor', 'viewer']).nullable(),
});

// ── create_collection ────────────────────────────────────────────────

export const createCollectionInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  visibility: z.enum(['private', 'shared']).default('private'),
});

export const createCollectionOutputSchema = z.object({
  collection: collectionSummarySchema,
});

// ── update_collection ───────────────────────────────────────────────

export const updateCollectionInputSchema = z.object({
  collectionId: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  visibility: z.enum(['private', 'shared']).optional(),
});

export const updateCollectionOutputSchema = z.object({
  collection: collectionSummarySchema,
});

// ── delete_collection ───────────────────────────────────────────────

const deleteCollectionInputSchema = z.object({
  collectionId: z.string().uuid(),
});

export const deleteCollectionOutputSchema = z.object({
  deleted: z.boolean(),
});

// ── leave_collection ────────────────────────────────────────────────

const leaveCollectionInputSchema = z.object({
  collectionId: z.string().uuid(),
});

export const leaveCollectionOutputSchema = z.object({
  left: z.boolean(),
});

// ── add_collection_item ──────────────────────────────────────────────

export const addCollectionItemInputSchema = z.object({
  collectionId: z.string().uuid(),
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
  note: z.string().trim().max(1000).optional(),
});

export const addCollectionItemOutputSchema = z.object({
  item: collectionItemSchema,
});

// ── remove_collection_item ───────────────────────────────────────────

export const removeCollectionItemInputSchema = z.object({
  collectionId: z.string().uuid(),
  entityType: entityTypeSchema,
  entityId: z.string().uuid(),
});

export const removeCollectionItemOutputSchema = z.object({
  removed: z.boolean(),
});

// ── list_collections ─────────────────────────────────────────────────

export const listCollectionsInputSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listCollectionsOutputSchema = z.object({
  collections: z.array(collectionSummarySchema),
  count: z.number().int().min(0),
});

// ── collection_detail ────────────────────────────────────────────────

export const collectionDetailInputSchema = z.object({
  collectionId: z.string().uuid(),
});

export const collectionDetailOutputSchema = collectionDetailSchema;

// ── invite_member ────────────────────────────────────────────────────

export const inviteMemberInputSchema = z.object({
  collectionId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['editor', 'viewer']).default('viewer'),
});

export const inviteMemberOutputSchema = z.object({
  member: collectionMemberSchema,
});

// ── update_member_role ──────────────────────────────────────────────

export const updateMemberRoleInputSchema = z.object({
  collectionId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum(['editor', 'viewer']),
});

export const updateMemberRoleOutputSchema = z.object({
  member: collectionMemberSchema,
});

// ── remove_member ────────────────────────────────────────────────────

const removeMemberInputSchema = z.object({
  collectionId: z.string().uuid(),
  memberId: z.string().uuid(),
});

export const removeMemberOutputSchema = z.object({
  removed: z.boolean(),
});

// ── accept_member_invite ─────────────────────────────────────────────

export const acceptMemberInviteInputSchema = z.object({
  collectionId: z.string().uuid(),
});

export const acceptMemberInviteOutputSchema = z.object({
  member: collectionMemberSchema,
});

// ── list_pending_invites ─────────────────────────────────────────────

export const listPendingInvitesInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
});

const pendingInviteSchema = z.object({
  collection: collectionSummarySchema,
  role: z.enum(['owner', 'editor', 'viewer']),
  invitedAt: z.string(),
});

export const listPendingInvitesOutputSchema = z.object({
  invites: z.array(pendingInviteSchema),
  count: z.number().int().min(0),
});

export type CollectionSummary = z.output<typeof collectionSummarySchema>;
export type CollectionMember = z.output<typeof collectionMemberSchema>;
export type CollectionItem = z.output<typeof collectionItemSchema>;
export type CollectionDetail = z.output<typeof collectionDetailSchema>;
export type CreateCollectionInput = z.output<typeof createCollectionInputSchema>;
export type UpdateCollectionInput = z.output<typeof updateCollectionInputSchema>;
export type DeleteCollectionInput = z.output<typeof deleteCollectionInputSchema>;
export type LeaveCollectionInput = z.output<typeof leaveCollectionInputSchema>;
export type AddCollectionItemInput = z.output<typeof addCollectionItemInputSchema>;
export type RemoveCollectionItemInput = z.output<typeof removeCollectionItemInputSchema>;
export type ListCollectionsInput = z.output<typeof listCollectionsInputSchema>;
export type InviteMemberInput = z.output<typeof inviteMemberInputSchema>;
export type UpdateMemberRoleInput = z.output<typeof updateMemberRoleInputSchema>;
export type RemoveMemberInput = z.output<typeof removeMemberInputSchema>;
export type AcceptMemberInviteInput = z.output<typeof acceptMemberInviteInputSchema>;
export type ListPendingInvitesInput = z.output<typeof listPendingInvitesInputSchema>;
