import * as z from 'zod';

import { collectionMemberSchema, collectionSummarySchema } from './collections.schema';

const placeSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

const placeListItemSchema = z.object({
  place: placeSummarySchema,
  note: z.string().nullable(),
  visited: z.boolean(),
  addedAt: z.string(),
});

const placeListDetailSchema = z.object({
  placeList: collectionSummarySchema.nullable(),
  items: z.array(placeListItemSchema),
  members: z.array(collectionMemberSchema),
});

// ── create_place_list ────────────────────────────────────────────────

export const createPlaceListInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  visibility: z.enum(['private', 'shared']).default('private'),
});

export const createPlaceListOutputSchema = z.object({
  placeList: collectionSummarySchema,
});

// ── add_place_to_list ────────────────────────────────────────────────

function requirePlaceIdentifier(
  value: { placeId?: string; name?: string },
  context: z.RefinementCtx,
) {
  if (!value.placeId && !value.name) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either placeId or name to identify the place.',
      path: ['name'],
    });
  }
}

const addPlaceFieldsSchema = z.object({
  placeId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  address: z.string().trim().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  note: z.string().trim().max(1000).optional(),
});

// The body shape for the RPC route, which carries placeListId in the URL
// instead of the request body.
export const addPlaceToListBodySchema = addPlaceFieldsSchema.superRefine(requirePlaceIdentifier);

export const addPlaceToListInputSchema = addPlaceFieldsSchema
  .extend({ placeListId: z.string().uuid() })
  .superRefine(requirePlaceIdentifier);

export const addPlaceToListOutputSchema = z.object({
  item: placeListItemSchema,
});

// ── remove_place_from_list ───────────────────────────────────────────

export const removePlaceFromListInputSchema = z.object({
  placeListId: z.string().uuid(),
  placeId: z.string().uuid(),
});

export const removePlaceFromListOutputSchema = z.object({
  removed: z.boolean(),
});

// ── list_place_lists ─────────────────────────────────────────────────

export const listPlaceListsInputSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listPlaceListsOutputSchema = z.object({
  placeLists: z.array(collectionSummarySchema),
  count: z.number().int().min(0),
});

// ── place_list_detail ────────────────────────────────────────────────

export const placeListDetailInputSchema = z.object({
  placeListId: z.string().uuid(),
});

export const placeListDetailOutputSchema = placeListDetailSchema;

// ── invite_place_list_collaborator ───────────────────────────────────

export const inviteCollaboratorInputSchema = z.object({
  placeListId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['editor', 'viewer']).default('viewer'),
});

export const inviteCollaboratorOutputSchema = z.object({
  member: collectionMemberSchema,
});

// ── accept_place_list_invite ─────────────────────────────────────────

export const acceptCollaboratorInviteInputSchema = z.object({
  placeListId: z.string().uuid(),
});

export const acceptCollaboratorInviteOutputSchema = z.object({
  member: collectionMemberSchema,
});

// ── list_pending_invites ─────────────────────────────────────────────

export const listPendingInvitesInputSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const listPendingInvitesOutputSchema = z.object({
  invites: z.array(
    z.object({
      placeList: collectionSummarySchema,
      role: z.enum(['owner', 'editor', 'viewer']),
      invitedAt: z.string(),
    }),
  ),
  count: z.number().int().min(0),
});

// Types
export type CreatePlaceListInput = z.output<typeof createPlaceListInputSchema>;
export type AddPlaceToListInput = z.output<typeof addPlaceToListInputSchema>;
export type RemovePlaceFromListInput = z.output<typeof removePlaceFromListInputSchema>;
export type ListPlaceListsInput = z.output<typeof listPlaceListsInputSchema>;
export type InviteCollaboratorInput = z.output<typeof inviteCollaboratorInputSchema>;
export type AcceptCollaboratorInviteInput = z.output<typeof acceptCollaboratorInviteInputSchema>;
export type ListPendingInvitesInput = z.output<typeof listPendingInvitesInputSchema>;
