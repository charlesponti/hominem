import { useCallback, useId, useState } from 'react'
import Alert from '~/components/alert'
import { Button } from '@hominem/ui/button'
import { Input } from '@hominem/ui/input'
import { Label } from '@hominem/ui/components/ui/label'
import * as Dialog from '@radix-ui/react-dialog'
import { useUpdateList } from '~/lib/lists'
import type { List } from '~/lib/types'
import { useListMenu } from './list-menu'

export default function ListEditSheet({ list }: { list: List }) {
  const { isEditSheetOpen, setIsEditSheetOpen } = useListMenu()
  const [name, setName] = useState(list.name)
  const [description, setDescription] = useState(list.description || '')
  const listNameId = useId()
  const descriptionId = useId()

  const updateList = useUpdateList({
    onSuccess: () => {
      setIsEditSheetOpen(false)
    },
    onError: (_error) => {
      // console.error("Error updating list:", error);
    },
    throwOnError: false,
  })

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
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
    [name, description, list.id, updateList]
  )

  return (
    <Dialog.Root open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg focus:outline-none">
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
            <div className="flex gap-4">
              <Button
                data-status={updateList.status}
                type="submit"
                className="btn btn-primary"
                disabled={updateList.status === 'pending'}
              >
                Save
              </Button>
            </div>
          </form>
          {updateList.isError ? (
            <Alert type="error">There was an issue editing your list. Try again later.</Alert>
          ) : null}
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
