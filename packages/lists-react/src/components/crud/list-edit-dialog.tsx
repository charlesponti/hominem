import { Alert, Form } from '@hominem/ui'
import { Button } from '@hominem/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hominem/ui/dialog'
import { TextArea } from '@hominem/ui/text-area'
import { TextField } from '@hominem/ui/text-field'
import { Trash2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'

import { useDeleteList, useUpdateList } from '../../hooks/use-lists'

interface ListEditDialogProps {
  list: {
    id: string
    name: string
    description: string | null
  }
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ListEditDialog({ list, isOpen, onOpenChange }: ListEditDialogProps) {
  const navigate = useNavigate()
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description || '')
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setName(list.name)
      setDescription(list.description || '')
      setShowDeleteConfirmation(false)
    }
  }

  const updateList = useUpdateList({
    onSuccess: () => {
      onOpenChange(false)
    },
    onError: () => {
      // Error is handled by React Query's isError
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
      if (showDeleteConfirmation) {
        return
      }

      try {
        await updateList.mutateAsync({
          id: list.id,
          name,
          description,
        })
      } catch {
        // Error is handled by React Query's isError
      }
    },
    [name, description, list.id, updateList, showDeleteConfirmation],
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
    [onOpenChange],
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {!showDeleteConfirmation ? (
          <>
            <DialogHeader>
              <DialogTitle>Edit list</DialogTitle>
              <DialogDescription>Update your list information</DialogDescription>
            </DialogHeader>
            <Form
              data-testid="list-edit-form"
              className="flex flex-col gap-4"
              onSubmit={handleSave}
            >
              <div>
                <TextField
                  type="text"
                  label="Name"
                  name="name"
                  placeholder="Enter list name"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <TextArea
                  label="Description"
                  placeholder="Enter list description"
                  value={description || ''}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-4 justify-between items-center">
                <Button
                  data-status={updateList.status}
                  type="submit"
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
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </Form>
            {updateList.isError ? (
              <Alert variant="destructive">
                There was an issue editing your list. Try again later.
              </Alert>
            ) : null}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Delete list</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{' '}
                <span className="font-semibold text-foreground">{list.name}</span>? This action
                cannot be undone and will permanently remove the list and all its places.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirmation(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteList.isPending}
              >
                {deleteList.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
