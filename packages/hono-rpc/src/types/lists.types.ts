import type { List, ListPlace } from '@hominem/lists-services';

/**
 * Explicit Type Contracts for Lists API
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

// ============================================================================
// List GetAll
// ============================================================================

export type ListGetAllOutput = JsonSerialized<Array<List>>;

export interface ListGetAllInput {
  itemType?: string;
}

// ============================================================================
// List GetById
// ============================================================================

export interface ListGetByIdInput {
  id: string;
}

export type ListGetByIdOutput = JsonSerialized<List> | null;

// ============================================================================
// List Create
// ============================================================================

export interface ListCreateInput {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export type ListCreateOutput = JsonSerialized<{
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  isPublic: boolean;
}>;

// ============================================================================
// List Update
// ============================================================================

export interface ListUpdateInput {
  id: string;
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export type ListUpdateOutput = JsonSerialized<{
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
  isPublic: boolean;
}>;

// ============================================================================
// List Delete
// ============================================================================

export interface ListDeleteInput {
  id: string;
}

export interface ListDeleteOutput {
  success: boolean;
}

// ============================================================================
// List DeleteItem
// ============================================================================

export interface ListDeleteItemInput {
  listId: string;
  itemId: string;
}

export interface ListDeleteItemOutput {
  success: boolean;
}

// ============================================================================
// List GetContainingPlace
// ============================================================================

export interface ListGetContainingPlaceInput {
  placeId?: string;
  googleMapsId?: string;
}

export type ListGetContainingPlaceOutput = JsonSerialized<
  Array<{
    id: string;
    name: string;
    isOwner: boolean;
  }>
>;

// ============================================================================
// List RemoveCollaborator
// ============================================================================

export interface ListRemoveCollaboratorInput {
  listId: string;
  userId: string;
}

export interface ListRemoveCollaboratorOutput {
  success: boolean;
}
