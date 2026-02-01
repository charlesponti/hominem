import type { ListOutput as DbListOutput } from '@hominem/db/types/lists';

export interface ListUser {
  id?: string | undefined;
  email?: string | undefined;
  name?: string | undefined;
  image?: string | null | undefined;
}

export interface ListWithSpreadOwner extends DbListOutput {
  owner: { id: string; email: string; name: string | null } | null;
  itemCount?: number;
}

export interface ListOutput extends DbListOutput {
  createdBy: { id: string; email: string; name: string | null } | null;
  isOwnList?: boolean | undefined;
  hasAccess?: boolean | undefined;
  places: ListPlace[];
  users?: ListUser[] | undefined;
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
