import { Link, useRevalidator } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import Alert from '~/components/alert'
import SentInvites from '~/components/lists/sent-invites'
import SentInviteForm from '~/components/lists/sent-invite-form'
import { PageTitle } from '@hominem/ui'
import { createCaller } from '~/lib/trpc/server'
import ErrorBoundary from '~/components/ErrorBoundary'
import type { SentInvite } from '~/lib/types'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~/lib/trpc/router'
import type { Route } from './+types/lists.$id.invites'

type RouterOutput = inferRouterOutputs<AppRouter>
type ListInviteFromLoader = RouterOutput['invites']['getByList'][number]

export async function loader({ request, params }: Route.LoaderArgs) {
  const listId = params.id
  if (!listId) {
    throw new Response('List ID is required', { status: 400 })
  }

  const trpcServer = createCaller(request)
  const [list, invites] = await Promise.all([
    trpcServer.lists.getById({ id: listId }),
    trpcServer.invites.getByList({ listId }),
  ])

  return { list, invites }
}

export default function ListInvites({ loaderData }: Route.ComponentProps) {
  const { list, invites: initialInvites } = loaderData
  const revalidator = useRevalidator()
  const [optimisticInvites, setOptimisticInvites] = useState<ListInviteFromLoader[] | null>(null)

  // Use optimistic state if available, otherwise use loader data
  const invites = useMemo(
    () => optimisticInvites ?? initialInvites ?? [],
    [optimisticInvites, initialInvites]
  )

  // Reset optimistic state when loader data changes (after revalidation)
  useEffect(() => {
    if (initialInvites && optimisticInvites) {
      // If the server data matches our optimistic state, we can clear it
      // Otherwise keep optimistic state until revalidation completes
      const serverEmails = new Set(initialInvites.map((inv) => inv.invitedUserEmail))
      const optimisticEmails = new Set(optimisticInvites.map((inv) => inv.invitedUserEmail))
      const isSynced =
        serverEmails.size === optimisticEmails.size &&
        Array.from(serverEmails).every((email) => optimisticEmails.has(email))
      if (isSynced) {
        setOptimisticInvites(null)
      }
    }
  }, [initialInvites, optimisticInvites])

  if (!list || !initialInvites) {
    return <Alert type="error">We could not find this list.</Alert>
  }

  const handleInviteSuccess = (_newInvite: SentInvite) => {
    // Just trigger revalidation - the mutation already succeeded server-side
    // The new invite will appear when revalidation completes
    // For smoother UX, we could optimistically add it, but the types don't match perfectly
    // between getReceived and getByList responses, so we'll let revalidation handle it
    revalidator.revalidate()
  }

  const handleInviteDeleted = (deletedEmail: string) => {
    // Optimistically remove the invite immediately for smooth UX
    setOptimisticInvites((prev) => {
      const current = prev ?? initialInvites ?? []
      return current.filter((inv) => inv.invitedUserEmail !== deletedEmail)
    })
    // Revalidate in background to sync with server
    revalidator.revalidate()
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="relative">
        <PageTitle
          title={list.name}
          subtitle="Invitations"
          actions={
            <Link
              to={`/lists/${list.id}`}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              View List
            </Link>
          }
        />
      </div>

      <div className="space-y-2">
        <SentInviteForm listId={list.id} onCreate={handleInviteSuccess} />
        <SentInvites invites={invites} listId={list.id} onInviteDeleted={handleInviteDeleted} />
      </div>
    </div>
  )
}

export { ErrorBoundary }
