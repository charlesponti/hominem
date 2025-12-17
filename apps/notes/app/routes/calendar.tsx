import { createSupabaseServerClient } from '@hominem/auth/server'
import { data } from 'react-router'
import { CalendarSync } from '~/components/calendar/calendar-sync'
import type { Route } from './+types/calendar'

export async function loader({ request }: { request: Request }) {
  const { supabase, headers } = createSupabaseServerClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return data({ googleTokens: [], userId: null }, { headers })
  }

  // Get session for provider tokens after verifying user
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const googleTokens: { access_token: string; refresh_token: string }[] = []
  if (session?.provider_token) {
    googleTokens.push({
      access_token: session.provider_token,
      refresh_token: session.provider_refresh_token ?? '',
    })
  }

  return data({ googleTokens, userId: user.id }, { headers })
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
          <CalendarSync userId={loaderData?.userId ?? ''} googleTokens={loaderData?.googleTokens} />
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
