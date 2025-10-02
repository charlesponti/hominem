import { useCallback, useId, useState } from 'react'
import Alert from '~/components/alert'
import Input from '~/components/input'
import { Button } from '~/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '~/components/ui/sheet'
import { useUpdateList } from '~/lib/trpc/api'
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
    <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
      <SheetContent>
        <SheetTitle>Edit list</SheetTitle>
        <SheetDescription>Update your list information</SheetDescription>
        <form
          data-testid="list-edit-form"
          className="flex flex-col gap-4 mt-4"
          onSubmit={handleSave}
        >
          <Input
            type="text"
            id={listNameId}
            label="Name"
            name="name"
            placeholder="Enter list name"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor={descriptionId} className="text-sm font-semibold">
              Description
            </label>
            <textarea
              id={descriptionId}
              placeholder="Enter list description"
              className="border-2 rounded-lg p-2 h-24 w-full"
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
      </SheetContent>
    </Sheet>
  )
}
