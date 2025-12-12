import { Button } from '@hominem/ui/button'
import { ArrowRight, ListCheck } from 'lucide-react'
import { useCallback } from 'react'
import { Link } from 'react-router'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~/lib/trpc/router'
import { trpc } from '~/lib/trpc/client'

type RouterOutput = inferRouterOutputs<AppRouter>
type InviteItem = RouterOutput['invites']['getAll'][number]

type InviteListItemProps =
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
      listInvite: InviteItem
      currentUserEmail?: string
      canAccept?: boolean
    }

const InviteListItem = (props: InviteListItemProps) => {
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
      <li className="flex flex-col gap-3 p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <ListCheck className="size-4 text-indigo-600" />
          </div>
          <p className="text-xl font-semibold text-gray-900">{preview.listName}</p>
        </div>

        {preview.coverPhoto ? (
          <div className="w-full h-40 bg-gray-100 rounded-md overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.coverPhoto}
              alt={preview.listName}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-40 rounded-md bg-linear-to-br from-indigo-50 to-purple-50 border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm">
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
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors font-medium"
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
    <li className="flex flex-col gap-3 p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
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
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors font-medium"
          >
            <span>View list</span>
            <ArrowRight size={18} />
          </Link>
        ) : (
          <AcceptButton status={status} canAccept={canAccept} onAcceptClick={onAcceptClick} />
        )}
      </div>
      {!accepted && isEmailMismatch && (
        <p className="text-xs text-amber-700">Invited as {listInvite.invitedUserEmail}</p>
      )}
    </li>
  )
}

export default InviteListItem

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
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors font-medium"
      disabled={status === 'pending' || !canAccept}
      onClick={onAcceptClick}
    >
      {status === 'pending' ? 'Accepting...' : canAccept ? 'Accept invite' : 'Sign in to accept'}
    </Button>
  )
}
