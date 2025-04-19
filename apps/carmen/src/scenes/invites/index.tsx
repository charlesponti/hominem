import InviteListItem from 'src/components/InviteListItem'
import { useGetInvites } from 'src/lib/api'
import { withAuth } from 'src/lib/utils'

const Invites = () => {
  const { data: invites, refetch } = useGetInvites()

  return (
    <>
      <h1 className="text-4xl mb-4">Invites</h1>
      {invites && (
        <ul className="space-y-4">
          {invites.map((listInvite) => (
            <InviteListItem key={listInvite.listId} listInvite={listInvite} onAccept={refetch} />
          ))}
        </ul>
      )}
    </>
  )
}

export const Component = withAuth(Invites)
