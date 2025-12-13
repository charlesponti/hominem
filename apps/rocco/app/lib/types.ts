import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from './trpc/router'

type RouterOutputs = inferRouterOutputs<AppRouter>

// Extract types from tRPC router outputs
export type List = RouterOutputs['lists']['getAll'][number]
export type SentInvite = RouterOutputs['invites']['getByList'][number]
export type Place = RouterOutputs['places']['getById']
export type PlaceWithLists = RouterOutputs['places']['getDetailsById']
export type Item = RouterOutputs['items']['getByListId'][number]
export type ReceivedInvite = RouterOutputs['invites']['getReceived'][number]

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

// Type for places in lists
export type ListPlace = GooglePlaceData
