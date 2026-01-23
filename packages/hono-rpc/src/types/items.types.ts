/**
 * Explicit Type Contracts for Items API
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

export interface ListItem {
  id: string;
  createdAt: string;
  itemId: string;
  listId: string;
  itemType: 'FLIGHT' | 'PLACE';
}

// ============================================================================
// Items AddToList
// ============================================================================

export interface ItemsAddToListInput {
  listId: string;
  itemId: string;
  itemType?: 'FLIGHT' | 'PLACE';
}

export type ItemsAddToListOutput = ListItem;

// ============================================================================
// Items RemoveFromList
// ============================================================================

export interface ItemsRemoveFromListInput {
  listId: string;
  itemId: string;
}

export interface ItemsRemoveFromListOutput {
  success: boolean;
}

// ============================================================================
// Items GetByListId
// ============================================================================

export interface ItemsGetByListIdInput {
  listId: string;
}

export type ItemsGetByListIdOutput = ListItem[];
