import { z } from 'zod';
import type { ApiResult } from '@hominem/services';

// ============================================================================
// Data Types
// ============================================================================

export type List = {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  // Lists often include items or places when fetched
  places?: any[];
  items?: any[];
  owner?: {
    id: string;
    name: string | null;
    email: string;
    imageUrl?: string | null;
  };
  collaborators?: Array<{
    id: string;
    name: string | null;
    email: string;
    imageUrl?: string | null;
  }>;
};

// ============================================================================
// GET ALL LISTS
// ============================================================================

export type ListGetAllInput = {
  itemType?: string;
};

export const listGetAllSchema = z.object({
  itemType: z.string().optional(),
});

export type ListGetAllOutput = ApiResult<List[]>;

// ============================================================================
// GET LIST BY ID
// ============================================================================

export type ListGetByIdInput = {
  id: string;
};

export const listGetByIdSchema = z.object({
  id: z.string().uuid(),
});

export type ListGetByIdOutput = ApiResult<List>;

// ============================================================================
// CREATE LIST
// ============================================================================

export type ListCreateInput = {
  name: string;
  description?: string;
  isPublic?: boolean;
};

export const listCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
});

export type ListCreateOutput = ApiResult<List>;

// ============================================================================
// UPDATE LIST
// ============================================================================

export type ListUpdateInput = {
  id: string;
  name?: string;
  description?: string;
  isPublic?: boolean;
};

export const listUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export type ListUpdateOutput = ApiResult<List>;

// ============================================================================
// DELETE LIST
// ============================================================================

export type ListDeleteInput = {
  id: string;
};

export const listDeleteSchema = z.object({
  id: z.string().uuid(),
});

export type ListDeleteOutput = ApiResult<{ success: boolean }>;

// ============================================================================
// DELETE LIST ITEM
// ============================================================================

export type ListDeleteItemInput = {
  listId: string;
  itemId: string;
};

export const listDeleteItemSchema = z.object({
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
});

export type ListDeleteItemOutput = ApiResult<{ success: boolean }>;

// ============================================================================
// GET CONTAINING PLACE
// ============================================================================

export type ListGetContainingPlaceInput = {
  placeId?: string;
  googleMapsId?: string;
};

export const listGetContainingPlaceSchema = z.object({
  placeId: z.string().uuid().optional(),
  googleMapsId: z.string().optional(),
});

export type ListGetContainingPlaceOutput = ApiResult<Array<{
  id: string;
  name: string;
  isOwner: boolean;
  itemCount: number;
  imageUrl: string | null;
}>>;

// ============================================================================
// REMOVE COLLABORATOR
// ============================================================================

export type ListRemoveCollaboratorInput = {
  listId: string;
  userId: string;
};

export const listRemoveCollaboratorSchema = z.object({
  listId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type ListRemoveCollaboratorOutput = ApiResult<{ success: boolean }>;
