export interface PlaceInput {
  googleMapsId: string;
  name: string;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location?: [number, number] | null;
  types?: string[] | null;
  rating?: number | null;
  websiteUri?: string | null;
  phoneNumber?: string | null;
  priceLevel?: number | null;
  photos?: string[] | null;
  imageUrl?: string | null;
  userId?: string;
}

export interface PlaceOutput {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  googleMapsId: string;
  rating: number | null;
  priceLevel: number | null;
  photos: string[] | null;
  types: string[] | null;
  websiteUri: string | null;
  phoneNumber: string | null;
  businessStatus: string | null;
  openingHours: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripOutput {
  id: string;
  name: string;
  userId: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripItemOutput {
  id: string;
  tripId: string;
  itemId: string;
  day: number | null;
  order: number | null;
  createdAt: string;
}
