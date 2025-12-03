import React, { useCallback } from 'react'
import Alert from '~/components/alert'
import { Button } from '~/components/ui/button'
import type { InviteItem } from '~/lib/component-types'
import { trpc } from '~/lib/trpc/client'
import Loading from '../loading'

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
    <li className="flex items-center justify-between gap-4 p-4 border border-gray-200 rounded-lg">
      <div>
        <p className="font-medium text-gray-900">{invite.invitedUserEmail}</p>
        {mutation.error && <Alert type="error">{mutation.error.message}</Alert>}
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
            {mutation.isPending ? (
              <span className="animate-pulse">
                <Loading size="sm" />
                Accepting...
              </span>
            ) : (
              <span>Accept</span>
            )}
          </Button>
        )}
      </div>
    </li>
  )
}

export default React.memo(ListInviteItem)
