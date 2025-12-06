import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useRouteLoaderData } from 'react-router'
import { trpc } from '~/lib/trpc/client'

interface LayoutLoaderData {
  user: {
    id: string
    email?: string
    name?: string
  }
  isAuthenticated: boolean
}

export async function clientLoader() {
  // For now, return empty data and let the client fetch with tRPC
  return { outboundInvites: [] }
}

const ListSentInvites = () => {
  const navigate = useNavigate()
  const { user } = useRouteLoaderData('routes/layout') as LayoutLoaderData
  const { data: outboundInvites = [] } = trpc.invites.getAllOutbound.useQuery()
  const data = outboundInvites

  if (!user?.id) {
    navigate('/')
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
