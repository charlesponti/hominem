import { Link, useLoaderData } from 'react-router'
import { Button } from '~/components/ui/button'
import { createCaller } from '~/lib/trpc/server'
import type { Route } from './+types'

export async function loader({ request }: Route.LoaderArgs) {
  const trpcServer = createCaller(request)
  const trips = await trpcServer.trips.getAll()
  return { trips }
}

export default function TripsPage() {
  const { trips } = useLoaderData<typeof loader>()

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Trips</h1>
        <Link to="/trips/create">
          <Button>Create New Trip</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {trips.map((trip) => (
          <Link
            to={`/trips/${trip.id}`}
            key={trip.id}
            className="p-4 border rounded-lg block hover:bg-gray-50"
          >
            <h2 className="text-xl font-semibold">{trip.name}</h2>
            {(trip.startDate || trip.endDate) && (
              <div className="text-sm text-gray-600 mt-1">
                {trip.startDate && (
                  <span>Start: {new Date(trip.startDate).toLocaleDateString()}</span>
                )}
                {trip.startDate && trip.endDate && <span className="mx-2">•</span>}
                {trip.endDate && <span>End: {new Date(trip.endDate).toLocaleDateString()}</span>}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
