import React, { useCallback } from 'react'
import Alert from '~/components/alert'
import { Button } from '~/components/ui/button'
import type { InviteItem } from '~/lib/component-types'
import { trpc } from '~/lib/trpc/client'

function ListInviteItem({
  invite,
  onAcceptInvite,
}: {
  invite: InviteItem
  onAcceptInvite: () => void
}) {
  const mutation = trpc.invites.accept.useMutation({
    onSuccess: onAcceptInvite,
  })
  const acceptInvite = useCallback(async () => {
    await mutation.mutateAsync({
      listId: invite.listId,
      invitedUserEmail: invite.invitedUserEmail,
    })
  }, [invite.listId, invite.invitedUserEmail, mutation])

  return (
    <li className="card shadow-md px-2 py-4 text-primary flex flex-row justify-between">
      <div className="flex-1">
        <p className={`text-lg flex flex-col gap-2${invite.accepted ? '' : ' text-gray-400'}`}>
          <span className="text-lg font-semibold">{invite.list?.name || 'Unknown List'}</span>
          <span className="text-sm text-gray-400">{invite.invitedUserEmail}</span>
        </p>
        {mutation.error && (
          <div className="mt-2">
            <Alert type="error">{mutation.error.message}</Alert>
          </div>
        )}
      </div>
      <div>
        {invite.accepted ? (
          <p className="text-md">✅ Accepted</p>
        ) : (
          <Button
            className="btn-success btn-sm rounded-md"
            onClick={acceptInvite}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Accepting...' : 'Accept'}
          </Button>
        )}
      </div>
    </li>
  )
}

export default React.memo(ListInviteItem)
