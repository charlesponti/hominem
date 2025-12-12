import { Button } from '@hominem/ui/button'
import { Label } from '@hominem/ui/components/ui/label'
import { Sheet, SheetContent } from '@hominem/ui/components/ui/sheet'
import { useToast } from '@hominem/ui/components/ui/use-toast'
import { useSupabaseAuth } from '@hominem/ui/supabase'
import { Heart, Loader2, PlusCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import ListForm from '~/components/lists/list-form'
import Loading from '~/components/loading'
import { useAddPlaceToList, useRemoveListItem } from '~/lib/places'
import { trpc } from '~/lib/trpc/client'
import type { Place } from '~/lib/types'
import { cn } from '~/lib/utils'

interface AddPlaceToListProps {
  place: Place
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

const AddPlaceToList = ({ place, isOpen, onOpenChange }: AddPlaceToListProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { toast } = useToast()
  const [loadingListId, setLoadingListId] = useState<string | null>(null)
  const { isAuthenticated } = useSupabaseAuth()

  const { isLoading, data: rawLists } = trpc.lists.getAll.useQuery()

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
          <h2 className="text-xl font-bold font-serif">Add to lists</h2>
          <p className="text-sm">Select lists to add this place to.</p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center h-16">
            <Loading size="xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
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
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 text-white rounded-lg transition-colors"
                  disabled={!isAuthenticated}
                >
                  <PlusCircle size={18} />
                  <span>Create New List</span>
                </Button>
              </div>
            )}

            {/* Existing lists */}
            <ul className="list-none divide-y divide-gray-200 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {lists?.map((list) => (
                <li key={list.id} className="relative hover:cursor-pointer">
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
