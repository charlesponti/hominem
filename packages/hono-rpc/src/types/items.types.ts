import { z } from 'zod';
import type { ApiResult } from '@hominem/services';

// ============================================================================
// Data Types
// ============================================================================

export type ListItem = {
  id: string;
  listId: string;
  itemId: string;
  itemType: 'FLIGHT' | 'PLACE';
  createdAt: string;
  updatedAt: string;
  // Depending on what getItemsByListId returns, it might include expanded data
  place?: any;
  flight?: any;
};

// ============================================================================
// ADD ITEM TO LIST
// ============================================================================

export type ItemsAddToListInput = {
  listId: string;
  itemId: string;
  itemType?: 'FLIGHT' | 'PLACE';
};

export const itemsAddToListSchema = z.object({
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
  itemType: z.enum(['FLIGHT', 'PLACE']).default('PLACE'),
});

export type ItemsAddToListOutput = ApiResult<ListItem>;

// ============================================================================
// REMOVE ITEM FROM LIST
// ============================================================================

export type ItemsRemoveFromListInput = {
  listId: string;
  itemId: string;
};

export const itemsRemoveFromListSchema = z.object({
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
});

export type ItemsRemoveFromListOutput = ApiResult<{ success: boolean }>;

// ============================================================================
// GET ITEMS BY LIST ID
// ============================================================================

export type ItemsGetByListIdInput = {
  listId: string;
};

export const itemsGetByListIdSchema = z.object({
  listId: z.string().uuid(),
});

export type ItemsGetByListIdOutput = ApiResult<ListItem[]>;
