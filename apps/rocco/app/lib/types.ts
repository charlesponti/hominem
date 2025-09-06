import type { item, list, listInvite, place, tags, userLists } from '@hominem/data/db/schema/index'

export type List = typeof list.$inferSelect
export type ListInsert = typeof list.$inferInsert
export type ListInvite = typeof listInvite.$inferSelect
export type ListInviteInsert = typeof listInvite.$inferInsert
export type Place = typeof place.$inferSelect & {
  isPreview?: boolean
}
export type PlaceInsert = typeof place.$inferInsert
export type Item = typeof item.$inferSelect
export type ItemInsert = typeof item.$inferInsert
export type Tag = typeof tags.$inferSelect
export type TagInsert = typeof tags.$inferInsert
export type UserList = typeof userLists.$inferSelect
export type UserListInsert = typeof userLists.$inferInsert

// Additional types for the frontend
export interface BaseModel {
  createdAt: string
  updatedAt: string
}

export type SearchPlace = {
  address: string
  googleMapsId: string
  latitude: number
  longitude: number
  name: string
}

export type PlaceLocation = {
  latitude: number
  longitude: number
}

// Type for temporary place data from Google Places API
export type GooglePlaceData = {
  id: string
  googleMapsId: string | null
  name: string
  address: string | null
  latitude: number
  longitude: number
  description: string | null
  types: string[] | null
  imageUrl: string | null
  phoneNumber: string | null
  rating: number | null
  websiteUri: string | null
  bestFor: string | null
  wifiInfo: string | null
  photos?: string[] | null
  priceLevel?: number | null
}

// Extended types for frontend use
export interface ExtendedList extends List {
  isOwnList?: boolean
  places?: Item[]
  itemCount?: number
}

export interface ExtendedListInvite extends ListInvite {
  list?: List
}

// Type for places in lists
export type ListPlace = GooglePlaceData
