import { Label } from '@hominem/ui'
import { Button } from '@hominem/ui/button'
import { Input } from '@hominem/ui/input'
import * as Dialog from '@radix-ui/react-dialog'
import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router'
import Alert from '~/components/alert'
import { useDeleteList, useUpdateList } from '~/lib/lists'
import type { List } from '~/lib/types'

type ListEditDialogProps = {
  list: List
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export default function ListEditDialog({ list, isOpen, onOpenChange }: ListEditDialogProps) {
  const navigate = useNavigate()
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description || '')
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const listNameId = useId()
  const descriptionId = useId()

  // Sync state when list prop changes
  useEffect(() => {
    if (isOpen) {
      setName(list.name)
      setDescription(list.description || '')
      setShowDeleteConfirmation(false)
    }
  }, [list.name, list.description, isOpen])

  const updateList = useUpdateList({
    onSuccess: () => {
      onOpenChange(false)
    },
    onError: (_error) => {
      // console.error("Error updating list:", error);
    },
    throwOnError: false,
  })

  const deleteList = useDeleteList({
    onSuccess: () => {
      onOpenChange(false)
      navigate('/lists')
    },
  })

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (showDeleteConfirmation) return
      try {
        await updateList.mutateAsync({
          id: list.id,
          name,
          description,
        })
      } catch (_error) {
        // Error is handled by React Query's isError, so nothing to do here
      }
    },
    [name, description, list.id, updateList, showDeleteConfirmation]
  )

  const handleDelete = useCallback(async () => {
    try {
      await deleteList.mutateAsync({ id: list.id })
    } catch (error) {
      console.error('Failed to delete list:', error)
    }
  }, [deleteList, list.id])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setShowDeleteConfirmation(false)
      }
      onOpenChange(open)
    },
    [onOpenChange]
  )

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          data-testid="list-edit-dialog"
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg focus:outline-none"
        >
          {!showDeleteConfirmation ? (
            <>
              <Dialog.Title>Edit list</Dialog.Title>
              <Dialog.Description>Update your list information</Dialog.Description>
              <form
                data-testid="list-edit-form"
                className="flex flex-col gap-4 mt-4"
                onSubmit={handleSave}
              >
                <div className="space-y-2">
                  <Label htmlFor={listNameId}>Name</Label>
                  <Input
                    type="text"
                    id={listNameId}
                    name="name"
                    placeholder="Enter list name"
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={descriptionId}>Description</Label>
                  <textarea
                    id={descriptionId}
                    placeholder="Enter list description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    value={description || ''}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="flex gap-4 justify-between items-center">
                  <Button
                    data-status={updateList.status}
                    type="submit"
                    className="btn btn-primary"
                    disabled={updateList.status === 'pending'}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteConfirmation(true)}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </form>
              {updateList.isError ? (
                <Alert type="error">There was an issue editing your list. Try again later.</Alert>
              ) : null}
            </>
          ) : (
            <>
              <Dialog.Title>Delete list</Dialog.Title>
              <Dialog.Description>
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">{list.name}</span>? This action
                cannot be undone and will permanently remove the list and all its places.
              </Dialog.Description>
              <div className="flex gap-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirmation(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteList.isPending}
                  className="flex-1"
                >
                  {deleteList.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </>
          )}
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-2 top-2 text-muted-foreground hover:text-gray-700"
              aria-label="Close"
            >
              <span className="sr-only">Close</span>×
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
