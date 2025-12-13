import type { SentInvite } from '~/lib/types'
import SentInviteItem from './sent-invite-item'
import InvitesEmptyState from './invites-empty-state'

type SentInvitesProps = {
  invites: SentInvite[]
  listId: string
  onInviteDeleted: (email: string) => void
}

export default function SentInvites({ invites, listId, onInviteDeleted }: SentInvitesProps) {
  if (invites.length === 0) {
    return <InvitesEmptyState />
  }

  return (
    <ul className="list-none divide-y divide-gray-200 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {invites.map((invite) => (
        <SentInviteItem
          key={invite.invitedUserEmail}
          invite={invite}
          listId={listId}
          onDelete={onInviteDeleted}
        />
      ))}
    </ul>
  )
}
