import { Button } from '@hominem/ui/button'
import { ArrowRight, ListCheck } from 'lucide-react'
import { useCallback } from 'react'
import { Link } from 'react-router'
import { trpc } from '~/lib/trpc/client'
import type { ReceivedInvite } from '~/lib/types'

type ReceivedInviteItemProps =
  | {
      variant: 'preview'
      preview: {
        listName: string
        coverPhoto?: string | null
        firstItemName?: string | null
        invitedUserEmail?: string | null
        onSignIn: () => void
      }
    }
  | {
      variant?: 'invite'
      listInvite: ReceivedInvite
      currentUserEmail?: string
      canAccept?: boolean
    }

const ReceivedInviteItem = (props: ReceivedInviteItemProps) => {
  const inviteProps = props.variant !== 'preview' ? props : null
  const previewProps = props.variant === 'preview' ? props : null

  const { mutate, status } = trpc.invites.accept.useMutation()

  const normalizedUserEmail = inviteProps?.currentUserEmail?.toLowerCase()
  const isEmailMismatch =
    normalizedUserEmail &&
    inviteProps &&
    normalizedUserEmail !== inviteProps.listInvite.invitedUserEmail.toLowerCase()

  const onAcceptClick = useCallback(() => {
    if (!inviteProps) return

    mutate({
      listId: inviteProps.listInvite.listId,
      token: inviteProps.listInvite.token,
    })
  }, [inviteProps, mutate])

  // Handle preview variant
  if (previewProps) {
    const { preview } = previewProps
    return (
      <li className="flex flex-col gap-3 p-6 bg-white border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <ListCheck className="size-4 text-indigo-600" />
          </div>
          <p className="text-xl font-semibold text-gray-900">{preview.listName}</p>
        </div>

        {preview.coverPhoto ? (
          <div className="w-full h-40 bg-gray-100 rounded-md overflow-hidden">
            <img
              src={preview.coverPhoto}
              alt={preview.listName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-40 rounded-md bg-linear-to-br from-indigo-50 to-purple-50 border border-dashed border-border flex items-center justify-center text-gray-400 text-sm">
            No photo yet
          </div>
        )}

        {preview.firstItemName && (
          <p className="text-sm text-gray-600">
            First item: <span className="font-medium text-gray-800">{preview.firstItemName}</span>
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Sign in to accept this invite{' '}
            {preview.invitedUserEmail ? (
              <span>
                for <span className="text-purple-700 font-medium">{preview.invitedUserEmail}</span>
              </span>
            ) : (
              'with your account.'
            )}
          </p>
          <Button
            className="px-4 py-2 rounded-lg shadow-sm transition-colors font-medium"
            onClick={preview.onSignIn}
          >
            Continue with Google
          </Button>
        </div>
      </li>
    )
  }

  // Handle invite variant - TypeScript knows inviteProps is not null here
  const { listInvite, canAccept = true } = inviteProps!
  const { accepted, list } = listInvite

  return (
    <li className="flex flex-col gap-3 p-6 bg-white border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <ListCheck className="size-4 text-indigo-600" />
          </div>
          <p className="text-xl font-semibold text-gray-900">{list?.name || 'Unknown List'}</p>
        </div>
        {accepted ? (
          <Link
            to={`/lists/${list?.id || listInvite.listId}`}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover active:bg-primary-hover text-primary-foreground rounded-lg shadow-sm transition-colors font-medium"
          >
            <span>View list</span>
            <ArrowRight size={18} />
          </Link>
        ) : (
          <AcceptButton status={status} canAccept={canAccept} onAcceptClick={onAcceptClick} />
        )}
      </div>
      {!accepted && isEmailMismatch && (
        <p className="flex flex-col gap-2 text-sm text-amber-700">
          <span>
            Invited as <span className="italic text-purple-400">{listInvite.invitedUserEmail}</span>
          </span>
          <span>Accepting will attach it to your current Google login.</span>
        </p>
      )}
    </li>
  )
}

export default ReceivedInviteItem

const AcceptButton = ({
  status,
  canAccept,
  onAcceptClick,
}: {
  status: 'pending' | 'success' | 'error' | 'idle'
  canAccept: boolean
  onAcceptClick: () => void
}) => {
  return (
    <Button
      className="px-4 py-2 rounded-lg shadow-sm transition-colors font-medium"
      disabled={status === 'pending' || !canAccept}
      onClick={onAcceptClick}
    >
      {status === 'pending' ? 'Accepting...' : canAccept ? 'Accept invite' : 'Sign in to accept'}
    </Button>
  )
}
