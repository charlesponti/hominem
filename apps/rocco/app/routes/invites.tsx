import { Mail } from 'lucide-react'
import { useLoaderData, useRevalidator, useRouteLoaderData } from 'react-router'
import InviteListItem from '~/components/InviteListItem'
import Loading from '~/components/loading'
import type { InviteItem } from '~/lib/component-types'
import { createCaller } from '~/lib/trpc/server'
import type { Route } from './+types/'

export async function loader({ request }: Route.LoaderArgs) {
  const trpcServer = createCaller(request)
  const url = new URL(request.url)
  const token = url.searchParams.get('token') || undefined
  const invites = await trpcServer.invites.getAll(token ? { token } : undefined)
  return { invites, token }
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center h-32">
      <Loading size="lg" />
    </div>
  )
}

const Invites = () => {
  const { invites, token } = useLoaderData<typeof loader>()
  const { revalidate } = useRevalidator()
  const layoutData = useRouteLoaderData('routes/layout') as {
    user: { email?: string } | null
    isAuthenticated: boolean
  }
  const currentUserEmail = layoutData?.user?.email?.toLowerCase()

  const handleAccept = () => {
    revalidate()
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <Mail className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Your Invitations</h1>
          </div>
          <p className="text-base md:text-lg text-gray-700 max-w-2xl">
            View and manage your list invitations from other users.
          </p>
        </div>
      </div>

      {token && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Invite loaded via secure link. Accepting will attach it to your current Google login.
        </div>
      )}

      {/* Empty State */}
      {(!invites || invites.length === 0) && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 md:p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No invitations yet</h3>
          <p className="text-gray-600 max-w-md">
            When someone invites you to collaborate on a list, you'll see it here.
          </p>
        </div>
      )}

      {/* Invites List */}
      {invites && invites.length > 0 && (
        <ul className="space-y-4">
          {invites.map((listInvite: InviteItem) => (
            <InviteListItem
              key={`${listInvite.listId}-${listInvite.token}`}
              listInvite={listInvite}
              currentUserEmail={currentUserEmail}
              onAccept={handleAccept}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

export default Invites

export function ErrorBoundary({ error }: { error: unknown }) {
  console.error(error)
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Invitations</h3>
      <p className="text-red-700">An unexpected error occurred while loading invites.</p>
    </div>
  )
}
