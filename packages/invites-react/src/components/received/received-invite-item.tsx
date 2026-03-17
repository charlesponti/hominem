import { Inline, Stack } from '@hominem/ui'
import { Button } from '@hominem/ui/button'
import { ArrowRight, ListCheck } from 'lucide-react'
import { useCallback } from 'react'
import { Link } from 'react-router'

export interface ReceivedInvite {
  id: string
  listId: string
  invitedUserEmail: string | null
  token: string
  status: 'pending' | 'accepted' | 'declined'
  list?: {
    id: string
    name: string
  }
}

export interface ReceivedInviteItemProps {
  variant?: 'invite' | 'preview'
  listInvite?: ReceivedInvite
  currentUserEmail?: string
  canAccept?: boolean
  preview?: {
    listName: string
    coverPhoto?: string | null
    firstItemName?: string | null
    invitedUserEmail?: string | null
  }
}

export function ReceivedInviteItem({
  variant = 'invite',
  listInvite,
  currentUserEmail,
  canAccept = true,
  preview,
}: ReceivedInviteItemProps) {
  const normalizedUserEmail = currentUserEmail?.toLowerCase()
  const normalizedInviteEmail = listInvite?.invitedUserEmail?.toLowerCase()
  const isEmailMismatch =
    normalizedUserEmail && normalizedInviteEmail && normalizedUserEmail !== normalizedInviteEmail

  // Handle preview variant
  if (variant === 'preview' && preview) {
    return (
      <li className="flex flex-col gap-3 p-6 bg-secondary border border-border">
        <Inline gap="sm">
          <div className="size-8 bg-muted flex items-center justify-center shrink-0">
            <ListCheck className="size-4 text-primary" />
          </div>
          <p className="text-xl font-semibold text-foreground">{preview.listName}</p>
        </Inline>

        {preview.coverPhoto ? (
          <div className="w-full h-40 bg-muted overflow-hidden">
            <img
              src={preview.coverPhoto}
              alt={preview.listName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-40 bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground text-sm">
            No photo yet
          </div>
        )}

        {preview.firstItemName && (
          <p className="text-sm text-muted-foreground">
            First item: <span className="font-medium text-foreground">{preview.firstItemName}</span>
          </p>
        )}

        <Stack gap="sm" className="sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Sign in to accept this invite{' '}
            {preview.invitedUserEmail ? (
              <span>
                for <span className="text-foreground font-medium">{preview.invitedUserEmail}</span>
              </span>
            ) : (
              'with your account.'
            )}
          </p>
        </Stack>
      </li>
    )
  }

  // Handle invite variant
  if (!listInvite) return null

  const { status, list } = listInvite
  const isAccepted = status === 'accepted'

  const onAcceptClick = useCallback(() => {
    // This would be connected to useAcceptInvite in consumer apps
  }, [])

  return (
    <li className="flex flex-col gap-3 p-6 bg-secondary border border-border">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
        <Inline gap="sm">
          <div className="size-8 bg-muted flex items-center justify-center shrink-0">
            <ListCheck className="size-4 text-primary" />
          </div>
          <p className="text-xl font-semibold text-foreground">{list?.name || 'Unknown List'}</p>
        </Inline>
        {isAccepted ? (
          <Link
            to={`/lists/${list?.id || listInvite.listId}`}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-hover text-primary-foreground font-medium"
          >
            <span>View list</span>
            <ArrowRight size={18} />
          </Link>
        ) : (
          <AcceptButton status={false} canAccept={canAccept} onAcceptClick={onAcceptClick} />
        )}
      </div>
      {!isAccepted && isEmailMismatch && (
        <Stack as="p" gap="sm" className="text-sm text-muted-foreground">
          <span>
            Invited as <span className="italic text-muted-foreground">{listInvite.invitedUserEmail}</span>
          </span>
          <span>Accepting will attach it to your current signed-in account.</span>
        </Stack>
      )}
    </li>
  )
}

interface AcceptButtonProps {
  status: boolean
  canAccept: boolean
  onAcceptClick: () => void
}

function AcceptButton({ status, canAccept, onAcceptClick }: AcceptButtonProps) {
  return (
    <Button className="px-4 py-2 font-medium" disabled={status || !canAccept} onClick={onAcceptClick}>
      {status ? 'Accepting...' : canAccept ? 'Accept invite' : 'Sign in to accept'}
    </Button>
  )
}
