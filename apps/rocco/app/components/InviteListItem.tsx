import { ArrowRight, ListCheck } from 'lucide-react'
import { useCallback } from 'react'
import { Link } from 'react-router'
import { Button } from '@hominem/ui/components/ui/button'
import type { InviteItem } from '~/lib/component-types'
import { trpc } from '~/lib/trpc/client'

type InviteListItemProps = {
  listInvite: InviteItem
  onAccept: () => void
  currentUserEmail?: string
}
const InviteListItem = ({ listInvite, onAccept, currentUserEmail }: InviteListItemProps) => {
  const { accepted, list } = listInvite
  // Use invites.accept mutation (correct router)
  const { mutate, status } = trpc.invites.accept.useMutation({
    onSuccess: onAccept,
  })

  const normalizedUserEmail = currentUserEmail?.toLowerCase()
  const isEmailMismatch =
    normalizedUserEmail && normalizedUserEmail !== listInvite.invitedUserEmail.toLowerCase()

  const onAcceptClick = useCallback(() => {
    if (
      isEmailMismatch &&
      !window.confirm(
        `You were invited as ${listInvite.invitedUserEmail}, but you're signed in as ${normalizedUserEmail}. Accept this invite with your current account?`
      )
    ) {
      return
    }

    mutate({
      listId: listInvite.listId,
      token: listInvite.token,
    })
  }, [
    isEmailMismatch,
    listInvite.invitedUserEmail,
    listInvite.listId,
    listInvite.token,
    mutate,
    normalizedUserEmail,
  ])

  return (
    <li className="flex flex-row items-center justify-between p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <ListCheck className="w-5 h-5 text-indigo-600" />
        </div>
        <p className="text-xl font-semibold text-gray-900">{list?.name || 'Unknown List'}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {accepted ? (
          <Link
            to={`/lists/${list?.id || listInvite.listId}`}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors font-medium"
          >
            <span>View list</span>
            <ArrowRight size={18} />
          </Link>
        ) : (
          <Button
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors font-medium"
            disabled={status === 'pending'}
            onClick={onAcceptClick}
          >
            {status === 'pending' ? 'Accepting...' : 'Accept invite'}
          </Button>
        )}
        {!accepted && isEmailMismatch && (
          <p className="text-sm text-amber-700">
            Invited as {listInvite.invitedUserEmail}; signed in as {normalizedUserEmail}
          </p>
        )}
      </div>
    </li>
  )
}

export default InviteListItem
