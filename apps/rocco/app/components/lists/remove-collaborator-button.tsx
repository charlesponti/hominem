import { Button } from '@hominem/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hominem/ui/dialog'
import { Trash2 } from 'lucide-react'
import { useCallback } from 'react'
import { useModal } from '~/hooks/useModal'
import { trpc } from '~/lib/trpc/client'

type RemoveCollaboratorButtonProps = {
  listId: string
  userId: string
  userName: string
  userEmail: string
}

export default function RemoveCollaboratorButton({
  listId,
  userId,
  userName,
  userEmail,
}: RemoveCollaboratorButtonProps) {
  const { isOpen, open, close } = useModal()
  const utils = trpc.useUtils()
  const removeCollaborator = trpc.lists.removeCollaborator.useMutation()

  const handleRemove = useCallback(async () => {
    // Store previous values for rollback
    const previousList = utils.lists.getById.getData({ id: listId })
    const previousInvites = utils.invites.getByList.getData({ listId })

    try {
      // Optimistically update the list cache to remove the collaborator
      utils.lists.getById.setData({ id: listId }, (old) => {
        if (!old || !old.users) return old
        return {
          ...old,
          users: old.users.filter((u) => u.id !== userId),
        }
      })

      // Optimistically update the invites list to remove the accepted invite
      utils.invites.getByList.setData({ listId }, (old) => {
        if (!old) return old
        return old.filter((invite) => invite.user_invitedUserId?.id !== userId)
      })

      // Sync with server
      await removeCollaborator.mutateAsync({
        listId,
        userId,
      })

      // Invalidate queries to ensure fresh data
      utils.lists.getById.invalidate({ id: listId })
      utils.invites.getByList.invalidate({ listId })

      close()
    } catch (error) {
      console.error('Failed to remove collaborator:', error)
      // Rollback optimistic updates on error
      if (previousList) {
        utils.lists.getById.setData({ id: listId }, previousList)
      }
      if (previousInvites) {
        utils.invites.getByList.setData({ listId }, previousInvites)
      }
      // Also invalidate to ensure we get fresh data
      utils.lists.getById.invalidate({ id: listId })
      utils.invites.getByList.invalidate({ listId })
    }
  }, [removeCollaborator, listId, userId, utils, close])

  const displayName = userName || userEmail

  return (
    <>
      <Button
        data-testid="remove-collaborator-button"
        variant="ghost"
        size="icon"
        onClick={open}
        disabled={removeCollaborator.isPending}
        title="Remove collaborator"
      >
        <Trash2 className="size-4 text-red-700" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
        <DialogContent
          className="sm:max-w-lg"
          aria-label="Remove collaborator confirmation"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Remove collaborator</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-semibold text-foreground">{displayName}</span> from this list?
              They will no longer have access to this list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              disabled={removeCollaborator.isPending}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
