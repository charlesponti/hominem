import { List } from '@hominem/ui/list'

import { InvitesEmptyState } from '../received/invites-empty-state'

interface SentInvite {
  listId: string
  invitedUserEmail: string
  token: string
  accepted: boolean
  user_invitedUserId?: {
    id: string
    name: string | null
    email: string
  } | null
}

interface SentInvitesProps {
  invites: SentInvite[]
  listId: string
  onInviteDeleted?: (email: string) => void
}

export function SentInvites({ invites }: SentInvitesProps) {
  if (invites.length === 0) {
    return <InvitesEmptyState />
  }

  return (
    <List>
      {invites.map((invite) => (
        <div key={invite.invitedUserEmail} className="p-3 border-b border-border">
          {invite.invitedUserEmail}
        </div>
      ))}
    </List>
  )
}
