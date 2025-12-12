import { useSupabaseAuth } from '@hominem/ui/supabase'
import { ArrowLeft } from 'lucide-react'
import { Link, Navigate } from 'react-router'
import Loading from '~/components/loading'
import { trpc } from '~/lib/trpc/client'

const ListSentInvites = () => {
  const { userId } = useSupabaseAuth()
  const { data, isLoading } = trpc.invites.getAllOutbound.useQuery()

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
      <h1>Sent Invites</h1>
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

export default ListSentInvites
