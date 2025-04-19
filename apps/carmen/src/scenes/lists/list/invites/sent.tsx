import { useNavigate } from 'react-router-dom'

import AppLink from 'src/components/AppLink'
import { useGetOutboundInvites } from 'src/lib/api'
import { useAuth } from 'src/lib/auth'

import { useEffect } from 'react'

const ListSentInvites = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data } = useGetOutboundInvites()

  useEffect(() => {
    if (user) {
      navigate('/')
    }
  }, [user, navigate])

  return (
    <>
      <div className="my-4">
        <AppLink btn to="/lists/invites">
          <span className="mr-1">⬅️</span> Back to invites
        </AppLink>
      </div>
      <h1>Sent Invites</h1>
      <div>
        {data?.length === 0 && 'Your invites will appear here.'}
        {data && data.length > 0 && (
          <ul className="space-y-2">
            {data.map((invite) => (
              <li key={invite.listId} className="card shadow-md p-4">
                <p>
                  <span className="font-semibold mr-2">List:</span>
                  {invite.list.name}
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
