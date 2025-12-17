import type { ListSelect } from "../../db/schema";

export interface ListUser {
  id?: string;
  email?: string;
  name?: string;
  image?: string | null;
}

export interface ListWithSpreadOwner extends ListSelect {
  owner: { id: string; email: string; name: string | null } | null;
  itemCount?: number;
}

export interface List {
  id: string;
  name: string;
  description: string;
  userId: string;
  createdBy: { id: string; email: string; name: string | null } | null;
  isOwnList?: boolean;
  hasAccess?: boolean;
  places: ListPlace[];
  isPublic: boolean;
  users?: ListUser[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Type definition for list places
 */
export interface ListPlace {
  id: string;
  /** The ID of the place entity (references place.id) */
  placeId: string;
  description: string | null;
  itemAddedAt: string;
  googleMapsId: string | null;
  name: string;
  imageUrl: string | null;
  photos: string[] | null;
  types: string[] | null;
  type: string;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  address: string | null;
  addedBy: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}
