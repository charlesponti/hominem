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
import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useDeleteList } from '~/lib/lists'

type ListDeleteDialogProps = {
  listId: string
  listName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export default function ListDeleteDialog({
  listId,
  listName,
  isOpen,
  onOpenChange,
}: ListDeleteDialogProps) {
  const navigate = useNavigate()
  const deleteList = useDeleteList({
    onSuccess: () => {
      onOpenChange(false)
      navigate('/lists')
    },
  })

  const handleDelete = useCallback(async () => {
    try {
      await deleteList.mutateAsync({ id: listId })
    } catch (error) {
      console.error('Failed to delete list:', error)
      // Error handling could be improved here with toast notifications
    }
  }, [deleteList, listId])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-label="Delete list confirmation" showCloseButton>
        <DialogHeader>
          <DialogTitle>Delete list</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">{listName}</span>? This action cannot be
            undone and will permanently remove the list and all its places.
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
            disabled={deleteList.isPending}
          >
            {deleteList.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
