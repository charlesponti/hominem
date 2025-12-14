import { Button } from '@hominem/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hominem/ui/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { useCallback } from 'react'
import { useModal } from '~/hooks/useModal'
import { trpc } from '~/lib/trpc/client'

type DeleteInviteButtonProps = {
  listId: string
  invitedUserEmail: string
  onDelete: (email: string) => void
}

export default function DeleteInviteButton({
  listId,
  invitedUserEmail,
  onDelete,
}: DeleteInviteButtonProps) {
  const { isOpen, open, close } = useModal()
  const deleteInvite = trpc.invites.delete.useMutation()

  const handleDelete = useCallback(async () => {
    // Optimistically remove immediately
    onDelete(invitedUserEmail)
    try {
      await deleteInvite.mutateAsync({ listId, invitedUserEmail })
      close()
    } catch (error) {
      console.error('Failed to delete invite:', error)
      // Note: We don't rollback here since onDelete was already called
      // The parent component should handle error recovery if needed
    }
  }, [deleteInvite, listId, invitedUserEmail, onDelete, close])

  return (
    <>
      <Button
        variant="destructive"
        size="icon"
        className="p-2"
        onClick={open}
        disabled={deleteInvite.isPending}
        title="Delete invite"
      >
        <Trash2 className="size-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
        <DialogContent
          className="sm:max-w-lg"
          aria-label="Delete invite confirmation"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Delete invite</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the invite for{' '}
              <span className="font-semibold text-foreground">{invitedUserEmail}</span>? This action
              cannot be undone.
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
              onClick={handleDelete}
              disabled={deleteInvite.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
