import { tripsService } from '@hominem/places-services';
import { PageTitle } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { Input } from '@hominem/ui/input';
import { useId } from 'react';
import { Form, Link, useNavigation } from 'react-router';

import ErrorBoundary from '~/components/ErrorBoundary';

import type { Route } from './+types/trips.create';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const startDateStr = formData.get('startDate') as string;
  const endDateStr = formData.get('endDate') as string;

  // Convert date strings to Date objects if provided
  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  try {
    const trip = await tripsService.create({ name, startDate, endDate });
    return { success: true, tripId: trip.id };
  } catch {
    return { success: false, error: 'Failed to create trip' };
  }
}

export default function CreateTripPage({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const nameId = useId();
  const startDateId = useId();
  const endDateId = useId();

  // Redirect to the new trip page on successful creation
  if (actionData?.success && actionData.tripId) {
    return (
      <div className="text-center">
        <PageTitle title="Trip Created Successfully!" />
        <p className="mb-4">Your trip has been created.</p>
        <Link to={`/trips/${actionData.tripId}`}>
          <Button>View Trip</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <PageTitle title="Create a New Trip" />

      <Form method="post">
        <div className="space-y-6">
          <div>
            <label htmlFor={nameId} className="block text-sm font-medium text-gray-700 mb-2">
              Trip Name
            </label>
            <Input
              id={nameId}
              name="name"
              placeholder="Enter trip name"
              required
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor={startDateId} className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <Input id={startDateId} name="startDate" type="date" className="w-full" />
            </div>
            <div>
              <label htmlFor={endDateId} className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <Input id={endDateId} name="endDate" type="date" className="w-full" />
            </div>
          </div>

          {actionData?.success === false && (
            <div className="text-red-500 bg-red-50 p-3 rounded-md">{actionData.error}</div>
          )}

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Creating Trip...' : 'Create Trip'}
            </Button>
            <Link to="/trips">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </Form>
    </div>
  );
}

export { ErrorBoundary };
