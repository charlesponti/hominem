import { Link2 } from 'lucide-react'
import { useCallback } from 'react'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import type { InviteItem } from '~/lib/component-types'
import { trpc } from '~/lib/trpc/client'

type InviteListItemProps = {
  listInvite: InviteItem
  onAccept: () => void
}
const InviteListItem = ({ listInvite, onAccept }: InviteListItemProps) => {
  const { accepted, list } = listInvite
  const { mutate, status } = trpc.invites.accept.useMutation({
    onSuccess: onAccept,
  })

  const onAcceptClick = useCallback(() => {
    mutate({
      listId: listInvite.listId,
      invitedUserEmail: listInvite.invitedUserEmail,
    })
  }, [listInvite.listId, listInvite.invitedUserEmail, mutate])

  return (
    <li className="card p-4 text-lg flex flex-row items-center justify-between border min-h-[82px]">
      <p className="text-lg font-semibold">{list?.name || 'Unknown List'}</p>
      {accepted ? (
        <Link
          to={`/list/${list?.id || listInvite.listId}`}
          className="flex items-center gap-2 text-md normal-case font-medium btn btn-outline"
        >
          View list
          <Link2 size={24} />
        </Link>
      ) : (
        <Button className="normal-case" disabled={status === 'pending'} onClick={onAcceptClick}>
          Accept invite
        </Button>
      )}
    </li>
  )
}

export default InviteListItem
