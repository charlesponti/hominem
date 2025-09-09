import { json, useLoaderData } from 'react-router'
import { Form, useActionData, useNavigation } from 'react-router-dom'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { trpc } from '~/lib/trpc/client'
import type { Route } from '../+types/trips._index'

export async function loader({ request: _request }: Route.LoaderArgs) {
  const trips = await trpc.trips.getAll.query()
  return json({ trips })
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const name = formData.get('name') as string
  // TODO: Add start and end date handling
  try {
    await trpc.trips.create.mutate({ name })
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
        <div className="flex gap-2">
          <Input name="name" placeholder="Trip name" required />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Trip'}
          </Button>
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
            {/* TODO: Display start and end dates */}
          </Link>
        ))}
      </div>
    </div>
  )
}
