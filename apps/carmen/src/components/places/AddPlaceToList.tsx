import styled from '@emotion/styled'
import { Heart } from 'lucide-react'

import { Sheet, SheetContent } from 'src/components/ui/sheet'
import { useGetLists } from 'src/lib/api'
import { useAddPlaceToList, useGetPlaceLists, useRemoveListItem } from 'src/lib/api/places'
import type { Place } from 'src/lib/types'
import { cn } from 'src/lib/utils'
import { usePlaceContext } from 'src/scenes/place/place-context'

const ListItem = styled.li`
  &:first-of-type {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }

  &:last-of-type {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
`

const AddPlaceToList = ({
  onSuccess,
  place,
}: {
  onSuccess: () => void
  place: Place
}) => {
  const { isSaveSheetOpen, setIsSaveSheetOpen } = usePlaceContext()
  const { isLoading, data: lists } = useGetLists()
  const { data: placeLists, isLoading: isPlaceListLoading } = useGetPlaceLists({
    placeId: place.id,
  })
  const { mutateAsync: removeFromList } = useRemoveListItem({})
  const { mutate: addToList } = useAddPlaceToList({
    onSuccess: () => {
      onSuccess?.()
    },
  })
  const listIds = placeLists?.map((list) => list.id) ?? []

  const onListSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (listIds.includes(e.target.id)) {
      removeFromList({ listId: e.target.id, placeId: place.id })
      return
    }

    addToList({ listIds: [e.target.id], place })
  }

  // List of lists displaying their name and a round checkbox that when clicked adds the list to the listIds array
  return (
    <Sheet open={isSaveSheetOpen} onOpenChange={setIsSaveSheetOpen}>
      <SheetContent className="pt-10 px-4">
        <div className="my-6">
          <h2 className="text-xl font-bold">Add to lists</h2>
          <p className="text-sm">Select lists to add this place to.</p>
        </div>
        {isLoading || isPlaceListLoading ? (
          <div className="flex items-center justify-center h-16">
            <div className="loading loading-infinity w-14" />
          </div>
        ) : (
          <ul className="list-none">
            {lists.map((list) => (
              <ListItem key={list.id} className="relative border hover:cursor-pointer">
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
              </ListItem>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default AddPlaceToList
