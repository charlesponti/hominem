import { Button } from '@hominem/ui/button'
import { Label } from '@hominem/ui/components/ui/label'
import { useToast } from '@hominem/ui/components/ui/use-toast'
import { useSupabaseAuth } from '@hominem/ui/supabase'
import * as Dialog from '@radix-ui/react-dialog'
import { Heart, ListPlus, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import Loading from '~/components/loading'
import { useAddPlaceToList, useRemoveListItem } from '~/lib/places'
import { trpc } from '~/lib/trpc/client'
import type { Place } from '~/lib/types'
import { cn } from '~/lib/utils'
import ListSurface from '../list-surface'
import CreateListControls from './create-list-controls'

interface AddPlaceToListProps {
  place: Place
}

const AddPlaceToList = ({ place }: AddPlaceToListProps) => {
  const [isOpen, setIsOpen] = useState(false)
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
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <Button
          type="button"
          className="flex items-center gap-2 transition-colors"
        >
          <ListPlus size={20} />
          <span>Save</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 bottom-0 z-50 w-full max-w-lg -translate-x-1/2 rounded-t-xl border border-border bg-slate-300/50 shadow-xl focus:outline-none pb-12">
          <div className="border-b border-border p-4">
            <Dialog.Title className="text-2xl font-serif tracking-tighter italic font-semilight text-foreground">
              Add to lists
            </Dialog.Title>
            <Dialog.Description className="text-xs font-sans text-muted-foreground">
              Select lists to add this place to.
            </Dialog.Description>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center h-24 px-6 py-4">
              <Loading size="xl" />
            </div>
          ) : (
            <div className="flex flex-col gap-1 px-2 py-4">
              <CreateListControls
                isAuthenticated={isAuthenticated}
                onCreate={(newList) => addToList({ listIds: [newList.id], place })}
              />

              {/* Existing lists */}
              <ListSurface>
                {lists?.map((list) => (
                  <li
                    key={list.id}
                    className="relative hover:cursor-pointer transition-colors duration-150 hover:bg-muted/60"
                  >
                    <Label
                      htmlFor={list.id}
                      className="flex justify-between items-center p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        id={list.id}
                        className="absolute size-full invisible -ml-2"
                        checked={list.isInList}
                        onChange={() => onListSelectChange(list.id, list.isInList)}
                      />
                      {list.name}
                      {loadingListId === list.id ? (
                        <Loader2 size={20} className="animate-spin text-muted-foreground" />
                      ) : (
                        <Heart
                          size={20}
                          className={cn('border-0', {
                            'fill-red-500': list.isInList,
                          })}
                        />
                      )}
                    </Label>
                  </li>
                ))}
              </ListSurface>
            </div>
          )}
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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

export default AddPlaceToList
