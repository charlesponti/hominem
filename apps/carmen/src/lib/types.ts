interface BaseModel {
  createdAt: string
  updatedAt: string
}

export type User = BaseModel & {
  id: string
  avatar: string
  email: string
  name: string
  isAdmin: string
}

export interface Idea extends BaseModel {
  id: string
  description: string
}

export interface List extends BaseModel {
  id: string
  name: string
  description: string
  userId: string
  createdBy?: { email: string }
}

export interface ListInvite extends BaseModel {
  invitedUserEmail: string
  listId: string
  accepted: boolean
  list: List
  user: User
}

export interface Bookmark extends BaseModel {
  id: string
  image: string
  title: string
  siteName: string
  url: string
}

export type UserList = List & {
  listId: string
  createdBy: User
}

export type SearchPlace = {
  address: string
  googleMapsId: Place['googleMapsId']
  latitude: number
  longitude: number
  name: string
}

export type ListPlace = {
  id: string
  imageUrl: string
  itemId: string
  name: string
  googleMapsId: Place['googleMapsId']
  types: string[]
  description: string
}

export type Place = {
  id: string
  address: string
  imageUrl: string
  phoneNumber: string
  latitude: number
  longitude: number
  name: string
  photos: string[]
  googleMapsId: string
  price_level: number
  rating: number
  types: string[]
  websiteUri: string
  lists?: List[]
}

export type PlaceLocation = {
  latitude: number
  longitude: number
}
