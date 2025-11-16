import { Heart, Plus } from 'lucide-react'
import { useState } from 'react'
import { useRouteLoaderData } from 'react-router'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import Loading from '~/components/loading'
import { Sheet, SheetContent } from '~/components/ui/sheet'
import { useAddPlaceToList, useGetPlaceLists, useRemoveListItem } from '~/lib/places'
import { useCreateList, useGetLists } from '~/lib/trpc/api'
import type { List, Place } from '~/lib/types'
import { cn } from '~/lib/utils'
import styles from './AddPlaceToList.module.css'

interface AddPlaceToListProps {
  onSuccess: () => void
  place: Place
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const AddPlaceToList = ({ onSuccess, place, isOpen, onOpenChange }: AddPlaceToListProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const layoutData = useRouteLoaderData('routes/layout') as { isAuthenticated: boolean } | undefined
  const isAuthenticated = layoutData?.isAuthenticated ?? false

  const { isLoading, data: lists } = useGetLists()
  const { data: placeLists, isLoading: isPlaceListLoading } = useGetPlaceLists()
  const { mutateAsync: removeFromList } = useRemoveListItem({})
  const { mutate: addToList } = useAddPlaceToList({
    onSuccess: () => {
      onSuccess?.()
    },
  })
  const { mutate: createList, isPending: isCreatingList } = useCreateList({
    onSuccess: (newList) => {
      // Automatically add the place to the newly created list
      addToList({ listIds: [newList.id], place })
      // Reset form
      setNewListName('')
      setNewListDescription('')
      setShowCreateForm(false)
    },
  })

  const listIds = placeLists ? placeLists.map((list: List) => list.id) : []

  const onListSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (listIds.includes(e.target.id)) {
      removeFromList({ listId: e.target.id, placeId: place.id })
      return
    }

    addToList({ listIds: [e.target.id], place })
  }

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListName.trim() || !isAuthenticated) return
    createList({
      name: newListName.trim(),
      description: newListDescription.trim() || 'No description',
    })
  }

  // List of lists displaying their name and a round checkbox that when clicked adds the list to the listIds array
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="pt-10 px-4">
        <div className="my-6">
          <h2 className="text-xl font-bold">Add to lists</h2>
          <p className="text-sm">Select lists to add this place to.</p>
        </div>
        {isLoading || isPlaceListLoading ? (
          <div className="flex items-center justify-center h-16">
            <Loading size="xl" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Create new list form */}
            {showCreateForm ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <form onSubmit={handleCreateList} className="space-y-3">
                  <div>
                    <Label htmlFor="new-list-name">List Name</Label>
                    <Input
                      id="new-list-name"
                      placeholder="Enter list name..."
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      required
                      disabled={!isAuthenticated || isCreatingList}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-list-description">Description (optional)</Label>
                    <Input
                      id="new-list-description"
                      placeholder="Enter description..."
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      disabled={!isAuthenticated || isCreatingList}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false)
                        setNewListName('')
                        setNewListDescription('')
                      }}
                      disabled={isCreatingList}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!isAuthenticated || isCreatingList || !newListName.trim()}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isCreatingList ? 'Creating...' : 'Create & Add'}
                    </Button>
                  </div>
                  {!isAuthenticated && (
                    <p className="text-sm text-gray-500">Sign in to create lists</p>
                  )}
                </form>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center justify-center gap-2"
                disabled={!isAuthenticated}
              >
                <Plus size={16} />
                Create New List
              </Button>
            )}

            {/* Existing lists */}
            <ul className="list-none">
              {lists?.map((list) => (
                <li
                  key={list.id}
                  className={`${styles.listItem} relative border hover:cursor-pointer`}
                >
                  <label
                    htmlFor={list.id}
                    className="flex justify-between items-center hover:cursor-pointer p-2"
                  >
                    <input
                      type="checkbox"
                      id={list.id}
                      className="absolute h-full w-full invisible -ml-2"
                      checked={listIds.includes(list.id)}
                      onChange={onListSelectChange}
                    />
                    {list.name}
                    <Heart
                      size={24}
                      className={cn({
                        'fill-red-500': listIds.includes(list.id),
                      })}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default AddPlaceToList
