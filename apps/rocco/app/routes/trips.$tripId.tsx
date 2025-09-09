import { useLoaderData } from 'react-router'
import { AddPlaceToTripModal } from '~/components/trips/add-place-to-trip-modal'
import { trpc as trpcServer } from '~/lib/trpc/server'
import type { Route } from './+types/trips.$tripId'

export async function loader({ params }: Route.LoaderArgs) {
  const trip = await trpcServer.trips.getById({ id: params.tripId })
  if (!trip) {
    throw new Response('Not Found', { status: 404 })
  }
  return { trip }
}

export default function TripPage() {
  const { trip } = useLoaderData<typeof loader>()

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{trip.name}</h1>
        <AddPlaceToTripModal tripId={trip.id} />
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
  )
}
