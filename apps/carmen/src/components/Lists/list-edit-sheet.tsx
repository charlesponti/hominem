import Alert from '@hominem/components/Alert'
import Input from '@hominem/components/Input'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { Button } from 'src/components/ui/button'
import { Sheet, SheetContent } from 'src/components/ui/sheet'
import api from 'src/lib/api'
import type { List } from 'src/lib/types'
import { useListMenu } from './list-menu'

export default function ListEditSheet({ list }: { list: List }) {
  const { isEditSheetOpen, setIsEditSheetOpen } = useListMenu()
  const nameInputRef = useRef<HTMLInputElement>()
  const [description, setDescription] = useState(list.description)
  const updateList = useMutation({
    mutationKey: ['updateList'],
    mutationFn: async (data: { name: string; description: string }) =>
      api.put(`/lists/${list.id}`, data),
    throwOnError: false,
  })

  const handleSave = async (e: React.FormEvent) => {
    await updateList.mutateAsync({
      name: nameInputRef.current?.value || list.name,
      description,
    })
  }

  return (
    <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
      <SheetContent>
        <h1 className="text-2xl font-bold">Edit list</h1>
        <form
          data-testid="list-edit-form"
          className="flex flex-col gap-4 mt-4"
          onSubmit={handleSave}
        >
          <Input
            type="text"
            id="listName"
            label="Name"
            name="name"
            placeholder="Enter list name"
            autoComplete="off"
            defaultValue={list.name}
            inputRef={nameInputRef}
          />
          <div className="flex flex-col gap-2">
            <label htmlFor="description" className="text-sm font-semibold">
              Description
            </label>
            <textarea
              id="description"
              placeholder="Enter list description"
              className="border-2 rounded-lg p-2 h-24 w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {/* <div className="flex flex-col gap-2">
						<label htmlFor="visibility" className="text-sm font-semibold">
							Visibility
						</label>
						<select
							id="visibility"
							className="input"
							defaultValue={list.visibility}
							value={list.visibility}
							onChange={(e) => setVisibility(e.target.value)}
						>
							<option value="public">Public</option>
							<option value="private">Private</option>
						</select>
					</div>
					<div className="flex flex-col gap-2">
						<label htmlFor="collaborators" className="text-sm font-semibold">
							Collaborators
						</label>
						<input
							type="text"
							id="collaborators"
							placeholder="Enter email addresses"
							className="input"
							defaultValue={list.collaborators}
							value={list.collaborators}
							onChange={(e) => setCollaborators(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-2">
						<label htmlFor="tags" className="text-sm font-semibold">
							Tags
						</label>
						<input
							type="text"
							id="tags"
							placeholder="Enter tags"
							className="input"
							defaultValue={list.tags}
							value={list.tags}
							onChange={(e) => setTags(e.target.value)}
						/>
					</div> */}
          <div className="flex gap-4">
            <Button
              type="submit"
              className="btn btn-primary"
              disabled={updateList.status === 'pending'}
            >
              Save
            </Button>
          </div>
        </form>
        {updateList.status === 'error' && (
          <Alert type="error">There was an issue editing your list. Try again later.</Alert>
        )}
      </SheetContent>
    </Sheet>
  )
}
