import { Inline } from '@hominem/ui'
import { Button } from '@hominem/ui/button'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@hominem/ui/components/ui/avatar'
import { Check, Link as LinkIcon, Mail } from 'lucide-react'
import { type ReactNode, useCallback, useState } from 'react'

import { DeleteInviteButton } from '../actions/delete-invite-button'

interface SentInviteUser {
  id: string
  name: string | null
  email?: string
}

interface SentInviteItemData {
  accepted: boolean
  invitedUserEmail: string
  token: string
  user_invitedUserId?: SentInviteUser | null
}

interface SentInviteItemProps {
  invite: SentInviteItemData
  listId: string
  onDelete: (email: string) => void
  /** Slot for the remove-collaborator control (e.g. RemoveCollaboratorButton from lists-react) */
  removeCollaboratorControl?: ReactNode
  baseUrl: string
}

export function SentInviteItem({
  invite,
  listId,
  onDelete,
  removeCollaboratorControl,
  baseUrl,
}: SentInviteItemProps) {
  const { accepted, invitedUserEmail, token, user_invitedUserId } = invite
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const getInviteUrl = useCallback(
    (inviteToken: string) => {
      const base = baseUrl.replace(/\/$/, '')
      return `${base}/invites?token=${inviteToken}&listId=${listId}`
    },
    [listId, baseUrl],
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
    [getInviteUrl],
  )

  const isCopied = copiedToken === token
  const userName: string = user_invitedUserId?.name || invitedUserEmail.split('@')[0] || 'U'
  const initials = userName.slice(0, 2).toUpperCase()

  return (
    <li className="flex flex-col md:flex-row md:items-center gap-3 p-3 group border-b border-border">
      <Inline gap="sm" className="flex-1 min-w-0">
        {accepted ? (
          <Avatar className="size-8">
            <AvatarImage src={undefined} alt={userName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        ) : (
          <Mail className="text-muted-foreground size-5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-light text-muted-foreground truncate text-base">{invitedUserEmail}</p>
        </div>
      </Inline>
      <div className="ml-0 md:ml-2 flex justify-end items-center gap-3 flex-wrap">
        {accepted ? (
          user_invitedUserId?.id && removeCollaboratorControl
        ) : (
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyInviteUrl(token)}
              className="p-2 text-muted-foreground hover:text-foreground"
              title="Copy invite URL"
            >
              {isCopied ? (
                <Check className="size-4 text-foreground" />
              ) : (
                <LinkIcon className="size-4" />
              )}
            </Button>
            <DeleteInviteButton
              listId={listId}
              invitedUserEmail={invitedUserEmail}
              onDelete={onDelete}
            />
            <span className="px-3 py-1 text-sm font-medium text-warning bg-warning-subtle">
              Pending
            </span>
          </>
        )}
      </div>
    </li>
  )
}

export default SentInviteItem
