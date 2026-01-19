import type { Place as PlaceSelect } from '@hominem/places-services';

import { getItemsForPlace } from '@hominem/places-services';
import { buildPhotoMediaUrl } from '@hominem/utils/google';
import { getHominemPhotoURL, sanitizeStoredPhotos } from '@hominem/utils/images';

import type { Context } from '../context';

export const buildPhotoUrl = (photoRef: string) =>
  buildPhotoMediaUrl({
    key: process.env.GOOGLE_API_KEY!,
    pathname: photoRef,
  });

export const enrichPlaceWithDetails = async (_ctx: Context, dbPlace: PlaceSelect) => {
  const itemsLinkingToThisPlace = await getItemsForPlace(dbPlace.id);

  const associatedLists = itemsLinkingToThisPlace
    .map((itemRecord) => itemRecord.list)
    .filter((listRecord): listRecord is { id: string; name: string } => Boolean(listRecord))
    .map((listRecord) => ({ id: listRecord.id, name: listRecord.name }));

  const placePhotos = sanitizeStoredPhotos(dbPlace.photos);

  // Resolve photo URLs server-side so clients receive ready-to-use image URLs:
  const thumbnailPhotos = placePhotos
    .map((p: string) => getHominemPhotoURL(p, 800, 800))
    .filter((p: string | null): p is string => Boolean(p));

  const fullPhotos = placePhotos
    .map((p: string) => getHominemPhotoURL(p, 1600, 1200))
    .filter((p: string | null): p is string => Boolean(p));

  return {
    ...dbPlace,
    associatedLists,
    // Keep the raw photos in the photos field
    photos: placePhotos,
    // Provided separately for display
    thumbnailPhotos,
    fullPhotos,
    // imageUrl should ideally also be raw, but if it's already used in many places,
    // it's safer to leave as-is or handle it similarly.
    // For now, let's just ensure we have the expanded photo fields.
  };
};
