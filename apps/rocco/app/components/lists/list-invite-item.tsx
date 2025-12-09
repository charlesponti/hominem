import React, { useCallback } from 'react'
import Alert from '~/components/alert'
import { Button } from '@hominem/ui/components/ui/button'
import type { InviteItem } from '~/lib/component-types'
import { trpc } from '~/lib/trpc/client'
import Loading from '../loading'

function ListInviteItem({ invite }: { invite: InviteItem }) {
  const mutation = trpc.invites.accept.useMutation()
  const acceptInvite = useCallback(async () => {
    await mutation.mutateAsync({
      listId: invite.listId,
      token: invite.token,
    })
  }, [invite.listId, invite.token, mutation])

  return (
    <li className="flex items-center justify-between gap-4 p-4">
      <div>
        <p className="font-medium text-gray-900">{invite.invitedUserEmail}</p>
        {mutation.error && <Alert type="error">{mutation.error.message}</Alert>}
      </div>
      <div>
        {invite.accepted ? (
          <p className="text-base font-medium text-green-600">✅ Accepted</p>
        ) : (
          <Button
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
            onClick={acceptInvite}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <span className="animate-pulse flex items-center gap-2">
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
