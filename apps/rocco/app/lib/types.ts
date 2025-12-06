import type { item, list, listInvite, place, tags, userLists } from '@hominem/data/db/schema/index'
export type List = typeof list.$inferSelect
export type ListInsert = typeof list.$inferInsert
export type ListInvite = typeof listInvite.$inferSelect
export type ListInviteInsert = typeof listInvite.$inferInsert
export type Place = typeof place.$inferSelect & {
  isPreview?: boolean
}
export type PlaceWithLists = Place & {
  photos?: string[]
  associatedLists: { id: string; name: string }[]
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
  id?: string
  name?: string
  imageUrl?: string | null
}

export type GooglePlacePrediction = {
  place_id: string
  text: string
  address: string
  location: PlaceLocation | null
  priceLevel?: string | number | null
}

export type GooglePlacesApiResponse = {
  id: string
  displayName?: {
    text: string
  }
  formattedAddress?: string
  location?: {
    latitude: number
    longitude: number
  }
  types?: string[]
  websiteUri?: string | null
  nationalPhoneNumber?: string | null
  priceLevel?: string
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

export type GooglePlacePhoto = {
  name?: string | null
}

export type GoogleAddressComponent = {
  longText: string
  shortText: string
  types: string[]
  languageCode: string
}

export type GooglePlaceDetailsResponse = {
  displayName?: { text?: string | null }
  formattedAddress?: string | null
  addressComponents?: GoogleAddressComponent[]
  location?: {
    latitude?: number | null
    longitude?: number | null
  }
  types?: string[]
  rating?: number | null
  websiteUri?: string | null
  nationalPhoneNumber?: string | null
  priceLevel?: string | null
  photos?: GooglePlacePhoto[]
}

// Extended types for frontend use
export interface ExtendedList extends List {
  isOwnList?: boolean
  hasAccess?: boolean
  places?: Item[]
  itemCount?: number
}

export interface ExtendedListInvite extends ListInvite {
  list?: List
}

// Type for places in lists
export type ListPlace = GooglePlaceData
