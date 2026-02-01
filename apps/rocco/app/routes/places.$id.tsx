import { getPlaceById, getPlaceByGoogleMapsId } from '@hominem/places-services';
import { PageTitle } from '@hominem/ui';
import { redirect } from 'react-router';
import z from 'zod';

import type { PlaceWithLists } from '~/lib/types';

import ErrorBoundary from '~/components/ErrorBoundary';
import PlaceTypes from '~/components/places/place-types';
import PlaceAddress from '~/components/places/PlaceAddress';
import PlaceLists from '~/components/places/PlaceLists';
import PlaceMap from '~/components/places/PlaceMap';
import PlacePhone from '~/components/places/PlacePhone';
import PlacePhotos from '~/components/places/PlacePhotos';
import PlaceRating from '~/components/places/PlaceRating';
import PlacesNearby from '~/components/places/places-nearby';
import PlaceStatus from '~/components/places/PlaceStatus';
import PlaceWebsite from '~/components/places/PlaceWebsite';
import { VisitHistory } from '~/components/places/VisitHistory';
import { requireAuth } from '~/lib/guards';

import type { Route } from './+types/places.$id';

export async function loader({ params, request }: Route.LoaderArgs) {
  await requireAuth(request);
  const { id } = params;
  if (!id) {
    return redirect('/404');
  }

  const isUuid = z.string().uuid().safeParse(id).success;
  const place = isUuid ? await getPlaceById(id) : await getPlaceByGoogleMapsId(id);

  if (!place) {
    return redirect('/404');
  }

  return {
    place: {
      ...place,
      lists: [], // Initial empty lists, components will fetch via hooks
    } as PlaceWithLists,
  };
}

export default function Place({ loaderData }: Route.ComponentProps) {
  const { place } = loaderData;

  return (
    <div data-testid="place" className="flex flex-col items-start gap-4">
      <div
        className="max-w-full animate-in fade-in slide-in-from-bottom-2 duration-700"
        style={{ viewTransitionName: `place-photos-${place.id}` }}
      >
        <PlacePhotos alt={place.name} photos={place.photos} placeId={place.id} />
      </div>

      <div className="w-full space-y-12">
        <div
          className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100"
          style={{ viewTransitionName: `place-header-${place.id}` }}
        >
          <PageTitle title={place.name} />

          <PlaceStatus businessStatus={place.businessStatus} openingHours={place.openingHours} />

          <div className="space-y-2">
            <PlaceTypes types={place.types || []} />

            {place.address && (
              <PlaceAddress
                address={place.address}
                name={place.name}
                place_id={place.googleMapsId || ''}
              />
            )}

            {place.websiteUri && <PlaceWebsite website={place.websiteUri} />}

            {place.phoneNumber && <PlacePhone phoneNumber={place.phoneNumber} />}

            {place.rating && <PlaceRating rating={place.rating} />}
          </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          <PlaceLists place={place} />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <VisitHistory placeId={place.id} placeName={place.name} />
        </div>

        {place.latitude !== null && place.longitude !== null && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            <PlacesNearby
              latitude={place.latitude}
              longitude={place.longitude}
              radiusMeters={5000}
            />
          </div>
        )}

        {place.latitude !== null && place.longitude !== null && (
          <div className="animate-in fade-in slide-in-from-right duration-700 delay-500">
            <PlaceMap
              latitude={place.latitude}
              longitude={place.longitude}
              name={place.name}
              googleMapsId={place.googleMapsId}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export { ErrorBoundary };
