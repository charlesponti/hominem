import { useSupabaseAuthContext } from '@hominem/auth'
import type { Route } from './+types/lists.$id.invites.sent'
import { PageTitle } from '@hominem/ui'
import { ArrowLeft } from 'lucide-react'
import { Link, Navigate } from 'react-router'
import Loading from '~/components/loading'
import { trpc } from '~/lib/trpc/client'
import ErrorBoundary from '~/components/ErrorBoundary'

export default function ListSentInvites(props: Route.ComponentProps) {
  const { userId } = useSupabaseAuthContext()
  const { data, isLoading } = trpc.invites.getSent.useQuery()

  if (!userId) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <div className="my-4">
        <Link to="/lists/invites" className="flex items-center gap-2">
          <ArrowLeft className="size-4" />
          Back to invites
        </Link>
      </div>
      <PageTitle title="Sent Invites" />
      <div>
        {isLoading && <Loading />}
        {data?.length === 0 && 'Your invites will appear here.'}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((invite) => (
              <li key={invite.listId} className="card shadow-md p-4">
                <p>
                  <span className="font-semibold mr-2">List ID:</span>
                  {invite.listId}
                </p>
                <p>
                  <span className="font-semibold mr-2">User:</span>
                  {invite.invitedUserEmail}
                </p>
                <p>
                  <span className="font-semibold mr-2">Accepted:</span>
                  {invite.accepted ? 'Accepted ✅' : 'Awaiting acceptance ⏳'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

export { ErrorBoundary }
