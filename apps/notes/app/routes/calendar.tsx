import { data, type LoaderFunctionArgs } from 'react-router'
import { CalendarSync } from '~/components/calendar/calendar-sync'
import { requireAuth } from '~/lib/guards'
import type { Route } from './+types/calendar'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, session, headers } = await requireAuth(request)

  // Check if user has Google account connected (without exposing tokens)
  const hasGoogleAccount = Boolean(session.provider_token)

  return data({ hasGoogleAccount, userId: user.id }, { headers })
}

export default function CalendarPage({ loaderData }: Route.ComponentProps) {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Calendar Sync</h1>
          <p className="text-muted-foreground">
            Sync your Google Calendar events with your personal calendar to keep track of all your
            events in one place.
          </p>
        </div>

        <div className="flex justify-center">
          <CalendarSync
            userId={loaderData?.userId ?? ''}
            hasGoogleAccount={loaderData?.hasGoogleAccount ?? false}
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Your synced events will appear in your personal calendar and can be managed alongside
            your other life events.
          </p>
        </div>
      </div>
    </div>
  )
}
