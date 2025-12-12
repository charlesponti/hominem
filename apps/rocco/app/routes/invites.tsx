import { useSupabaseAuth } from '@hominem/ui'
import { Mail } from 'lucide-react'
import { useCallback } from 'react'
import { useLoaderData } from 'react-router'
import InviteListItem from '~/components/InviteListItem'
import Loading from '~/components/loading'
import { env } from '~/lib/env'
import { getAuthState } from '~/lib/services/auth-loader.service'
import { buildInvitePreview } from '~/lib/services/invite-preview.service'
import { createCaller } from '~/lib/trpc/server'
import type { InviteItem } from '~/lib/types'
import type { Route } from './+types/invites'

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') || undefined

  const { isAuthenticated } = await getAuthState(request)

  // If not authenticated, allow viewing the page and return preview data when possible
  if (!isAuthenticated) {
    const preview = token ? await buildInvitePreview(token) : null

    return {
      invites: [],
      token,
      tokenMismatch: false,
      requiresAuth: true,
      preview,
    }
  }

  // Authenticated flow: fetch invites via tRPC
  const trpcServer = createCaller(request)
  const invites = (await trpcServer.invites.getAll(token ? { token } : undefined)) as InviteItem[]

  // Check if token belongs to another user
  const tokenMismatch = token
    ? Boolean(invites.find((invite) => invite.token === token)?.belongsToAnotherUser)
    : false

  return { invites, token, tokenMismatch, requiresAuth: false, preview: null }
}

export function meta(args: Route.MetaArgs) {
  const loaderData = args.loaderData
  const preview = loaderData?.preview

  // Build URL
  const fullPath = args.location.pathname + args.location.search
  const url = new URL(fullPath, env.VITE_APP_BASE_URL)

  // Default meta tags
  const defaultTags = [
    { title: 'List Invites - Rocco' },
    { name: 'description', content: 'View and accept list invitations' },
  ]

  // If we have preview data, add Open Graph tags for rich link previews
  if (preview) {
    const title = `You're invited to "${preview.listName}"`
    const description = preview.firstItemName
      ? `Join this list featuring ${preview.firstItemName} and more`
      : `Join "${preview.listName}" on Rocco`

    const tags = [
      { title },
      { name: 'description', content: description },
      // Open Graph tags
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url.href },
      // Twitter Card tags (also helps with some platforms)
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ]

    if (preview.coverPhoto) {
      const imageUrl = preview.coverPhoto

      tags.push(
        { property: 'og:image', content: imageUrl },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:image', content: imageUrl }
      )
    }

    return tags
  }

  return defaultTags
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center h-32">
      <Loading size="lg" />
    </div>
  )
}

const Invites = () => {
  const { invites, token, tokenMismatch, requiresAuth, preview } = useLoaderData<typeof loader>()
  const { isAuthenticated, user, supabase } = useSupabaseAuth()
  const currentUserEmail = user?.email?.toLowerCase()

  const onSignIn = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      },
    })
  }, [supabase])

  return (
    <div className="space-y-8 pb-8">
      <div className="sticky top-0 bg-white z-10 flex items-center gap-2">
        <Mail className="size-8 text-slate-300" />
        <h1 className="text-3xl font-semilight text-gray-900">List Invites</h1>
      </div>

      {preview && (
        <InviteListItem
          variant="preview"
          preview={{
            listName: preview.listName,
            coverPhoto: preview.coverPhoto,
            firstItemName: preview.firstItemName,
            invitedUserEmail: preview.invitedUserEmail,
            onSignIn,
          }}
        />
      )}

      {token && !tokenMismatch && !requiresAuth && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Invite loaded via secure link. Accepting will attach it to your current Google login.
        </div>
      )}

      {tokenMismatch && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          This invite was found, but it belongs to a different user. Please sign in with the correct
          email or ask the sender to re-invite you.
        </div>
      )}

      {/* Empty State */}
      {!requiresAuth && (!invites || invites.length === 0) && !tokenMismatch && (
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
      {!requiresAuth && invites && invites.length > 0 && (
        <ul className="space-y-4">
          {invites.map((listInvite: InviteItem) => (
            <InviteListItem
              key={`${listInvite.listId}-${listInvite.token}`}
              listInvite={listInvite}
              currentUserEmail={currentUserEmail}
              canAccept={isAuthenticated}
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
