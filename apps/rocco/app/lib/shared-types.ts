export type GooglePlaceDisplayName = {
  text?: string;
};

export type GooglePlaceLocation = {
  latitude?: number | null;
  longitude?: number | null;
};

export type GooglePlacePhoto = {
  name?: string | null;
};

export type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

export type GooglePlacesApiResponse = {
  id?: string | null;
  displayName?: GooglePlaceDisplayName | null;
  formattedAddress?: string | null;
  location?: GooglePlaceLocation | null;
  priceLevel?: string | number | null;
};

export interface BaseModel {
  createdAt: string;
  updatedAt: string;
}

export type SearchPlace = {
  address: string;
  googleMapsId: string;
  latitude: number;
  longitude: number;
  name: string;
};

export type PlaceLocation = {
  latitude: number;
  longitude: number;
  id?: string;
  name?: string;
  imageUrl?: string | null;
};

export type GooglePlacePrediction = {
  place_id: string;
  text: string;
  address: string;
  location: PlaceLocation | null;
  priceLevel?: string | number | null | undefined;
};

// Type for temporary place data from Google Places API
export type GooglePlaceData = {
  id: string;
  googleMapsId: string | null;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  types: string[] | null;
  imageUrl: string | null;
  phoneNumber: string | null;
  rating: number | null;
  websiteUri: string | null;
  bestFor: string | null;
  wifiInfo: string | null;
  photos?: string[] | null;
  priceLevel?: number | null;
};

export type GooglePlaceDetailsResponse = GooglePlacesApiResponse & {
  types?: string[] | null;
  rating?: number | null;
  websiteUri?: string | null;
  nationalPhoneNumber?: string | null;
  photos?: GooglePlacePhoto[] | null;
  addressComponents?: GoogleAddressComponent[] | null;
};
