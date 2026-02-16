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
import { createServerHonoClient } from '~/lib/api.server';

import type { Route } from './+types/places.$id';

export async function loader({ params, request }: Route.LoaderArgs) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) {
    return authResult;
  }

  const { id } = params;
  if (!id) {
    return redirect('/404');
  }

  const isUuid = z.string().uuid().safeParse(id).success;
  const client = createServerHonoClient(authResult.session?.access_token, request);
  const res = isUuid
    ? await client.api.places.get.$post({ json: { id } })
    : await client.api.places['get-by-google-id'].$post({ json: { googleMapsId: id } });

  if (!res.ok) {
    return redirect('/404');
  }

  const place = await res.json();

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
      <div className="max-w-full" style={{ viewTransitionName: `place-photos-${place.id}` }}>
        <PlacePhotos alt={place.name} photos={place.photos} placeId={place.id} />
      </div>

      <div className="w-full space-y-12">
        <div
          className="flex flex-col gap-2"
          style={{ viewTransitionName: `place-header-${place.id}` }}
        >
          <PageTitle title={place.name} />

          <PlaceStatus
            {...(place.businessStatus ? { businessStatus: place.businessStatus } : {})}
            {...(place.openingHours ? { openingHours: place.openingHours } : {})}
          />

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

        <div>
          <PlaceLists place={place} />
        </div>

        <div>
          <VisitHistory placeId={place.id} placeName={place.name} />
        </div>

        {place.latitude !== null && place.longitude !== null && (
          <div>
            <PlacesNearby
              latitude={place.latitude}
              longitude={place.longitude}
              radiusMeters={5000}
            />
          </div>
        )}

        {place.latitude !== null && place.longitude !== null && (
          <div>
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
