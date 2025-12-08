import type { ListPlace } from '@hominem/data'
import { ExternalLink, MoreVertical, Trash } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { href } from 'react-router'
import { Button } from '@hominem/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@hominem/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hominem/ui/components/ui/dropdown-menu'
import { useMapInteraction } from '~/contexts/map-interaction-context'
import { useRemoveListItem } from '~/lib/places'
import PlaceRow from './place-row'

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
      <li data-selected={isSelected}>
        <PlaceRow
          name={place.name}
          href={href('/places/:id', { id: place.itemId })}
          photoUrl={place.photos?.[0] ?? null}
          imageUrl={place.imageUrl}
          isSelected={isSelected}
          onMouseEnter={() => setHoveredPlaceId(place.itemId)}
          onMouseLeave={() => setHoveredPlaceId(null)}
          accessory={
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
                  <ExternalLink size={16} className="text-indigo-600 focus:text-white" />
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
          }
        />
      </li>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent
          data-testid="place-delete-modal"
          className="sm:max-w-lg"
          aria-label="Delete place confirmation"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Delete place</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{place.name}</span> from your list?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              data-testid="place-delete-confirm-button"
              onClick={onDeleteClick}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PlaceListItem
