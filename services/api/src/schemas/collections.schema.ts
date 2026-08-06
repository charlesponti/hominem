import * as z from 'zod';

import { entityTypeSchema } from './tags.schema';

export const collectionSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  visibility: z.enum(['private', 'shared']),
  itemCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const collectionMemberSchema = z.object({
  personId: z.string(),
  role: z.enum(['owner', 'editor', 'viewer']),
  invitedAt: z.string(),
  acceptedAt: z.string().nullable(),
});

export const collectionItemSchema = z.object({
  id: z.string(),
  entityType: entityTypeSchema,
  entityId: z.string(),
  note: z.string().nullable(),
  sortOrder: z.number().int().nullable(),
  addedAt: z.string(),
});

export const collectionDetailSchema = z.object({
  collection: collectionSummarySchema.nullable(),
  items: z.array(collectionItemSchema),
  members: z.array(collectionMemberSchema),
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
  limit: z.number().int().min(1).max(50).default(20),
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
  personId: z.string().uuid(),
  role: z.enum(['editor', 'viewer']).default('viewer'),
});

export const inviteMemberOutputSchema = z.object({
  member: collectionMemberSchema,
});

// ── accept_member_invite ─────────────────────────────────────────────

export const acceptMemberInviteInputSchema = z.object({
  collectionId: z.string().uuid(),
  personId: z.string().uuid(),
});

export const acceptMemberInviteOutputSchema = z.object({
  member: collectionMemberSchema,
});

// Types
export type CollectionSummary = z.output<typeof collectionSummarySchema>;
export type CollectionMember = z.output<typeof collectionMemberSchema>;
export type CollectionItem = z.output<typeof collectionItemSchema>;
export type CollectionDetail = z.output<typeof collectionDetailSchema>;
export type CreateCollectionInput = z.output<typeof createCollectionInputSchema>;
export type AddCollectionItemInput = z.output<typeof addCollectionItemInputSchema>;
export type RemoveCollectionItemInput = z.output<typeof removeCollectionItemInputSchema>;
export type ListCollectionsInput = z.output<typeof listCollectionsInputSchema>;
export type InviteMemberInput = z.output<typeof inviteMemberInputSchema>;
export type AcceptMemberInviteInput = z.output<typeof acceptMemberInviteInputSchema>;
