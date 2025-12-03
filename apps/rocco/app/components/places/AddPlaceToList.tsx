import { Heart, Loader2, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRouteLoaderData } from 'react-router'
import ListForm from '~/components/lists/list-form'
import Loading from '~/components/loading'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Sheet, SheetContent } from '~/components/ui/sheet'
import { useAddPlaceToList, useRemoveListItem } from '~/lib/places'
import { useGetLists } from '~/lib/trpc/api'
import type { Place } from '~/lib/types'
import { cn } from '~/lib/utils'
import styles from './AddPlaceToList.module.css'
import { useToast } from '../ui/use-toast'

interface AddPlaceToListProps {
  place: Place
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const AddPlaceToList = ({ place, isOpen, onOpenChange }: AddPlaceToListProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { toast } = useToast()
  const [loadingListId, setLoadingListId] = useState<string | null>(null)
  const layoutData = useRouteLoaderData('routes/layout') as { isAuthenticated: boolean } | undefined
  const isAuthenticated = layoutData?.isAuthenticated ?? false

  const { isLoading, data: rawLists } = useGetLists()

  // Derive isInList from cached lists data
  const lists = useMemo(() => {
    if (!rawLists || !place.googleMapsId) return []
    return rawLists.map((list) => ({
      ...list,
      isInList: list.places?.some((p) => p.googleMapsId === place.googleMapsId) ?? false,
    }))
  }, [rawLists, place.googleMapsId])
  const { mutateAsync: removeFromList } = useRemoveListItem({
    onSettled: () => setLoadingListId(null),
  })
  const { mutate: addToList } = useAddPlaceToList({
    onSuccess: () => {
      toast({
        title: 'Added to list!',
        variant: 'default',
      })
    },
    onSettled: () => setLoadingListId(null),
  })

  const onListSelectChange = (listId: string, isInList: boolean) => {
    setLoadingListId(listId)
    if (isInList) {
      if (place.id) {
        removeFromList({ listId, placeId: place.id })
      } else {
        setLoadingListId(null)
      }
      return
    }

    addToList({ listIds: [listId], place })
  }

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="pt-10 px-4">
        <div className="my-6">
          <h2 className="text-xl font-bold">Add to lists</h2>
          <p className="text-sm">Select lists to add this place to.</p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-16">
            <Loading size="xl" />
          </div>
        ) : (
          <div className="space-y-4">
            {showCreateForm ? (
              <div className="border rounded-lg p-4 bg-gray-50">
                <ListForm
                  isAuthenticated={isAuthenticated}
                  onCreate={(newList) => {
                    addToList({ listIds: [newList.id], place })
                    setShowCreateForm(false)
                  }}
                  onCancel={() => setShowCreateForm(false)}
                />
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
                  <Label
                    htmlFor={list.id}
                    className="flex justify-between items-center hover:cursor-pointer p-2"
                  >
                    <input
                      type="checkbox"
                      id={list.id}
                      className="absolute h-full w-full invisible -ml-2"
                      checked={list.isInList}
                      onChange={() => onListSelectChange(list.id, list.isInList)}
                    />
                    {list.name}
                    {loadingListId === list.id ? (
                      <Loader2 size={24} className="animate-spin text-gray-400" />
                    ) : (
                      <Heart
                        size={24}
                        className={cn({
                          'fill-red-500': list.isInList,
                        })}
                      />
                    )}
                  </Label>
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
