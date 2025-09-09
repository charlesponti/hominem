import { Form, Link, useActionData, useLoaderData, useNavigation } from 'react-router'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { trpc as trpcServer } from '~/lib/trpc/server'
import type { Route } from './+types'

export async function loader({ request: _request }: Route.LoaderArgs) {
  const trips = await trpcServer.trips.getAll()
  return { trips }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const name = formData.get('name') as string
  const startDateStr = formData.get('startDate') as string
  const endDateStr = formData.get('endDate') as string

  // Convert date strings to Date objects if provided
  const startDate = startDateStr ? new Date(startDateStr) : undefined
  const endDate = endDateStr ? new Date(endDateStr) : undefined

  try {
    await trpcServer.trips.create({ name, startDate, endDate })
    return { success: true }
  } catch (_error) {
    return { success: false, error: 'Failed to create trip' }
  }
}

export default function TripsPage() {
  const { trips } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Your Trips</h1>

      <Form method="post" className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Create a new trip</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input name="name" placeholder="Trip name" required />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Trip'}
            </Button>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <Input id="startDate" name="startDate" type="date" className="w-full" />
            </div>
            <div className="flex-1">
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input id="endDate" name="endDate" type="date" className="w-full" />
            </div>
          </div>
        </div>
        {actionData?.success === false && <p className="text-red-500 mt-2">{actionData.error}</p>}
      </Form>

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
