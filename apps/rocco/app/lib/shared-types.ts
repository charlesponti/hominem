import type { places_v1 } from 'googleapis';

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

export type GooglePlacesApiResponse = places_v1.Schema$GoogleMapsPlacesV1Place;

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

export type GoogleAddressComponent = places_v1.Schema$GoogleMapsPlacesV1PlaceAddressComponent;
export type GooglePlacePhoto = places_v1.Schema$GoogleMapsPlacesV1Photo;
export type GooglePlaceDetailsResponse = places_v1.Schema$GoogleMapsPlacesV1Place;
