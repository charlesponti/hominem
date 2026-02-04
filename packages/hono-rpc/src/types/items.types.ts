import type { PlaceGetDetailsByIdOutput } from './places.types'
import type { FlightOutput } from '../schemas/travel.schema'

// ============================================================================
// Data Types
// ============================================================================

export type ListItem = {
  id: string
  listId: string
  itemId: string
  itemType: 'FLIGHT' | 'PLACE'
  createdAt: string
  updatedAt: string
  // Depending on what getItemsByListId returns, it might include expanded data
  place?: PlaceGetDetailsByIdOutput | undefined
  flight?: FlightOutput | undefined
}

// ============================================================================
// ADD ITEM TO LIST
// ============================================================================

export type ItemsAddToListInput = {
  listId: string
  itemId: string
  itemType?: 'FLIGHT' | 'PLACE'
}

export type ItemsAddToListOutput = ListItem

// ============================================================================
// REMOVE ITEM FROM LIST
// ============================================================================

export type ItemsRemoveFromListInput = {
  listId: string
  itemId: string
}

export type ItemsRemoveFromListOutput = { success: boolean }

// ============================================================================
// GET ITEMS BY LIST ID
// ============================================================================

export type ItemsGetByListIdInput = {
  listId: string
}

export type ItemsGetByListIdOutput = ListItem[]
