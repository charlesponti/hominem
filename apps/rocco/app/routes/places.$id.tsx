import { PageTitle } from '@hominem/ui';
import z from 'zod';
import ErrorBoundary from '~/components/ErrorBoundary';
import PlaceAddress from '~/components/places/PlaceAddress';
import PlaceLists from '~/components/places/PlaceLists';
import PlaceMap from '~/components/places/PlaceMap';
import PlacePhone from '~/components/places/PlacePhone';
import PlacePhotos from '~/components/places/PlacePhotos';
import PlaceRating from '~/components/places/PlaceRating';
import PlaceStatus from '~/components/places/PlaceStatus';
import PlaceWebsite from '~/components/places/PlaceWebsite';
import PlaceTypes from '~/components/places/place-types';
import PlacesNearby from '~/components/places/places-nearby';
import { VisitHistory } from '~/components/places/VisitHistory';
import { requireAuth } from '~/lib/guards';
import { createCaller } from '~/lib/trpc/server';
import type { PlaceWithLists } from '~/lib/types';
import type { Route } from './+types/places.$id';

export async function loader({ params, request }: Route.LoaderArgs) {
  await requireAuth(request);
  const { id } = params;
  if (!id) {
    throw new Error('Place ID is required');
  }

  const trpcServer = createCaller(request);

  let data: PlaceWithLists;
  if (z.uuid().safeParse(id).success) {
    data = await trpcServer.places.getDetailsById({ id });
  } else {
    data = await trpcServer.places.getDetailsByGoogleId({ googleMapsId: id });
  }

  return { place: data };
}

export default function Place({ loaderData }: Route.ComponentProps) {
  const { place } = loaderData;

  return (
    <div data-testid="place" className="flex flex-col items-start gap-4">
      <div
        className="max-w-full animate-in fade-in slide-in-from-bottom-2 duration-700"
        style={{ viewTransitionName: `place-photos-${place.id}` }}
      >
        <PlacePhotos
          alt={place.name}
          photos={place.photos}
          thumbnailPhotos={place.thumbnailPhotos}
          fullPhotos={place.fullPhotos}
          placeId={place.id}
        />
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
              radiusKm={5}
              limit={4}
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
