import type { ListPlace } from '@hominem/data'
import { ExternalLink, MoreVertical, Trash } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { href } from 'react-router'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Sheet, SheetContent } from '~/components/ui/sheet'
import { useMapInteraction } from '~/contexts/map-interaction-context'
import { useRemoveListItem } from '~/lib/places'

interface PlaceItemProps {
  place: ListPlace
  listId: string
  onRemove?: () => void
  onError?: () => void
  isSelected?: boolean
}

const PlaceListItem = ({
  place,
  listId,
  onRemove,
  onError,
  isSelected = false,
}: PlaceItemProps) => {
  const { setHoveredPlaceId } = useMapInteraction()
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const { mutate: removeListItem } = useRemoveListItem({
    onSuccess: () => {
      setIsDeleteModalOpen(false)
      onRemove?.()
    },
    onError: () => {
      onError?.()
    },
  })

  const onDeleteClick = () => {
    removeListItem({ listId, placeId: place.itemId })
  }

  return (
    <>
      <li
        className="flex items-center justify-between gap-4 p-4"
        onMouseEnter={() => setHoveredPlaceId(place.itemId)}
        onMouseLeave={() => setHoveredPlaceId(null)}
        data-selected={isSelected}
      >
        <a
          className="flex-1 font-medium text-gray-900 outline-none focus:underline underline-offset-[5px]"
          href={href('/places/:id', { id: place.itemId })}
        >
          {place.name}
        </a>

        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                className="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                aria-label="More options"
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border border-gray-200 text-gray-900 shadow-lg">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault()
                  window.open(
                    `https://www.google.com/maps/search/${encodeURIComponent(place.name)}`,
                    '_blank'
                  )
                }}
                className="flex items-center gap-2"
              >
                <ExternalLink size={16} className="text-indigo-600" />
                Open in Maps
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault()
                  setIsDeleteModalOpen(true)
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash size={16} className="text-red-600" />
                Remove from list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </li>

      <Sheet open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <SheetContent
          data-testid="place-delete-modal"
          className="bg-white border-l border-gray-200 text-gray-900"
        >
          <div className="flex flex-col gap-4 mt-8">
            <h2 className="text-2xl font-semibold">Delete place</h2>
            <p className="text-gray-600">
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-900">{place.name}</span> from your list?
            </p>
            <div className="mt-6 flex gap-4 justify-end">
              <Button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <button
                type="button"
                data-testid="place-delete-confirm-button"
                onClick={onDeleteClick}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default PlaceListItem
