import { PageTitle } from '@hominem/ui';

import ErrorBoundary from '~/components/ErrorBoundary';
import { AddPlaceToTripModal } from '~/components/trips/add-place-to-trip-modal';

import type { Route } from './+types/trips.$tripId';

export async function loader({ params }: Route.LoaderArgs) {
  // TODO: Fetch trip data from API via client hook or server action
  return { trip: null };
}

export default function TripPage({ loaderData }: Route.ComponentProps) {
  const { trip } = loaderData;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <PageTitle
          title={trip.name}
          variant="serif"
          actions={<AddPlaceToTripModal tripId={trip.id} />}
        />
      </div>

      <div className="space-y-4">
        {trip.items.map(({ place, trip_items }) => (
          <div key={trip_items.id} className="p-4 border rounded-lg">
            <h2 className="text-xl font-semibold">{place.name}</h2>
            <p className="text-gray-600">{place.address}</p>
          </div>
        ))}
        {trip.items.length === 0 && (
          <p className="text-gray-500">
            This trip doesn't have any places yet. Add one to get started!
          </p>
        )}
      </div>
    </div>
  );
}

export { ErrorBoundary };
