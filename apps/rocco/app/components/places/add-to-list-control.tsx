import { useSupabaseAuthContext } from '@hominem/auth'
import { Button } from '@hominem/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@hominem/ui/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@hominem/ui/components/ui/popover'
import { Loading } from '@hominem/ui/loading'
import { Check, ListPlus, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRevalidator } from 'react-router'
import z from 'zod'
import { useAddPlaceToList, useRemoveListItem } from '~/lib/places'
import { trpc } from '~/lib/trpc/client'
import { cn } from '~/lib/utils'

interface AddToListControlProps {
  placeId: string
}

const AddToListControl = ({ placeId }: AddToListControlProps) => {
  const [open, setOpen] = useState(false)
  const [loadingListId, setLoadingListId] = useState<string | null>(null)
  const { isAuthenticated } = useSupabaseAuthContext()
  const revalidator = useRevalidator()
  const isUuid = z.uuid().safeParse(placeId).success

  // Fetch place details
  const { data: placeDetails } = trpc.places.getDetailsById.useQuery(
    { id: placeId },
    {
      enabled: isAuthenticated && isUuid,
    }
  )

  const { data: placeDetailsByGoogleId } = trpc.places.getDetailsByGoogleId.useQuery(
    { googleMapsId: placeId },
    {
      enabled: isAuthenticated && !isUuid,
    }
  )

  const place = placeDetails || placeDetailsByGoogleId
  const resolvedPlaceId = isUuid ? placeId : place?.id
  const googleMapsId = isUuid ? place?.googleMapsId : placeId

  const { isLoading, data: rawLists } = trpc.lists.getAll.useQuery()

  // Derive isInList from cached lists data
  const lists = useMemo(() => {
    if (!(rawLists && googleMapsId)) { return [] }
    return rawLists.map((list) => ({
      ...list,
      isInList: list.places?.some((p) => p.googleMapsId === googleMapsId) ?? false,
    }))
  }, [rawLists, googleMapsId])

  const { mutateAsync: removeFromList } = useRemoveListItem({
    onSettled: () => {
      setLoadingListId(null)
      revalidator.revalidate()
      setOpen(false)
    },
  })

  const { mutate: addToList } = useAddPlaceToList({
    onSuccess: () => {
      revalidator.revalidate()
      setOpen(false)
    },
    onSettled: () => setLoadingListId(null),
  })

  const onListSelectChange = (listId: string, isInList: boolean) => {
    if (!place) { return }

    setLoadingListId(listId)
    if (isInList) {
      if (resolvedPlaceId) {
        removeFromList({ listId, placeId: resolvedPlaceId })
      } else {
        setLoadingListId(null)
      }
      return
    }

    addToList({ listIds: [listId], place })
  }

  if (!(isAuthenticated && place)) {
    return null
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" className="flex items-center gap-2">
            <ListPlus size={8} />
            Add to lists
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search lists..." />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loading size="md" />
                </div>
              ) : (
                <>
                  <CommandEmpty>No lists found.</CommandEmpty>
                  <CommandGroup>
                    {lists.map((list) => (
                      <CommandItem
                        key={list.id}
                        value={list.name}
                        onSelect={() => {
                          onListSelectChange(list.id, list.isInList)
                        }}
                        className="flex items-center justify-between"
                      >
                        <span className="flex-1">{list.name}</span>
                        {loadingListId === list.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check
                            className={cn('h-4 w-4', {
                              'opacity-0': !list.isInList,
                              'opacity-100': list.isInList,
                            })}
                          />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default AddToListControl
