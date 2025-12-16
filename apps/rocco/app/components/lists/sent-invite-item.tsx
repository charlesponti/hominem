import { Button } from '@hominem/ui/button'
import { Check, Link as LinkIcon, Mail } from 'lucide-react'
import { useCallback, useState } from 'react'
import { env } from '~/lib/env'
import type { SentInvite } from '~/lib/types'
import UserAvatar from '../user-avatar'
import DeleteInviteButton from './delete-invite-button'
import RemoveCollaboratorButton from './remove-collaborator-button'

type SentInviteItemProps = {
  invite: SentInvite
  listId: string
  onDelete: (email: string) => void
}

export default function SentInviteItem({ invite, listId, onDelete }: SentInviteItemProps) {
  const { accepted, invitedUserEmail, token, user_invitedUserId } = invite
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const getInviteUrl = useCallback(
    (inviteToken: string) => {
      const baseUrl = env.VITE_APP_BASE_URL.replace(/\/$/, '')
      return `${baseUrl}/invites?token=${inviteToken}&listId=${listId}`
    },
    [listId]
  )

  const copyInviteUrl = useCallback(
    async (inviteToken: string) => {
      const url = getInviteUrl(inviteToken)
      try {
        await navigator.clipboard.writeText(url)
        setCopiedToken(inviteToken)
        setTimeout(() => setCopiedToken(null), 2000)
      } catch (error) {
        console.error('Failed to copy invite URL:', error)
      }
    },
    [getInviteUrl]
  )

  const isCopied = copiedToken === token
  const profilePhoto = user_invitedUserId?.photoUrl || user_invitedUserId?.image
  const userName: string = user_invitedUserId?.name || invitedUserEmail.split('@')[0] || 'U'

  return (
    <li className="flex flex-col md:flex-row md:items-center gap-3 p-3 group hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {accepted ? (
          <UserAvatar
            name={userName ?? undefined}
            email={invitedUserEmail}
            image={profilePhoto}
            size="sm"
          />
        ) : (
          <Mail className="text-gray-400 size-5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-light text-gray-600 truncate text-base">{invitedUserEmail}</p>
        </div>
      </div>
      <div className="ml-0 md:ml-2 flex justify-end items-center gap-3 flex-wrap">
        {accepted ? (
          user_invitedUserId?.id && (
            <RemoveCollaboratorButton
              listId={listId}
              userId={user_invitedUserId.id}
              userName={user_invitedUserId.name || ''}
              userEmail={invitedUserEmail}
            />
          )
        ) : (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyInviteUrl(token)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title="Copy invite URL"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <LinkIcon className="w-4 h-4" />
              )}
            </Button>
            <DeleteInviteButton
              listId={listId}
              invitedUserEmail={invitedUserEmail}
              onDelete={onDelete}
            />
            <span className="px-3 py-1 text-sm font-medium text-amber-700 bg-amber-100 rounded-full">
              Pending
            </span>
          </>
        )}
      </div>
    </li>
  )
}
