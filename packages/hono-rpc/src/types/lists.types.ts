import type { ListRecord } from '../schemas/lists.schema'
import type { ListItem } from './items.types'

// ============================================================================
// Data Types
// ============================================================================

export type ListUser = {
  id?: string | undefined
  email?: string | undefined
  name?: string | undefined
  image?: string | null | undefined
}

export type ListPlace = {
  id: string
  placeId: string
  description: string | null
  itemAddedAt: string
  googleMapsId: string | null
  name: string
  imageUrl: string | null
  photos: string[] | null
  types: string[] | null
  type: string
  latitude: number | null
  longitude: number | null
  rating: number | null
  address: string | null
  addedBy: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export type List = ListRecord & {
  places: ListPlace[]
  items?: ListItem[] | undefined
  createdBy: ListUser | null
  users?: ListUser[] | undefined
}

// ============================================================================
// GET ALL LISTS
// ============================================================================

export type ListGetAllInput = {
  itemType?: string
}

export type ListGetAllOutput = List[]

// ============================================================================
// GET LIST BY ID
// ============================================================================

export type ListGetByIdInput = {
  id: string
}

export type ListGetByIdOutput = List

// ============================================================================
// CREATE LIST
// ============================================================================

export type ListCreateInput = {
  name: string
  description?: string
  isPublic?: boolean
}

export type ListCreateOutput = List

// ============================================================================
// UPDATE LIST
// ============================================================================

export type ListUpdateInput = {
  id: string
  name?: string
  description?: string
  isPublic?: boolean
}

export type ListUpdateOutput = List

// ============================================================================
// DELETE LIST
// ============================================================================

export type ListDeleteInput = {
  id: string
}

export type ListDeleteOutput = { success: boolean }

// ============================================================================
// DELETE LIST ITEM
// ============================================================================

export type ListDeleteItemInput = {
  listId: string
  itemId: string
}

export type ListDeleteItemOutput = { success: boolean }

// ============================================================================
// GET CONTAINING PLACE
// ============================================================================

export type ListGetContainingPlaceInput = {
  placeId?: string
  googleMapsId?: string
}

export type ListGetContainingPlaceOutput = Array<{
  id: string
  name: string
  isOwner: boolean
  itemCount: number
  imageUrl: string | null
}>

// ============================================================================
// REMOVE COLLABORATOR
// ============================================================================

export type ListRemoveCollaboratorInput = {
  listId: string
  userId: string
}

export type ListRemoveCollaboratorOutput = { success: boolean }
