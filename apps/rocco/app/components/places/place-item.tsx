import type { ListPlace } from '@hominem/data'
import { ExternalLink, MoreVertical, Star } from 'lucide-react'
import { type MouseEvent, useState } from 'react'
import { href, useNavigate } from 'react-router'
import PlaceTypes from '~/components/places/PlaceTypes'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Sheet, SheetContent } from '~/components/ui/sheet'
import { useRemoveListItem } from '~/lib/places'

interface PlaceItemProps {
  place: ListPlace
  listId: string
  onRemove?: () => void
  onError?: () => void
}

const PlaceListItem = ({ place, listId, onRemove, onError }: PlaceItemProps) => {
  const navigate = useNavigate()
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

  const handleOpenGoogleMaps = (e: MouseEvent<HTMLButtonElement>, placeName: string) => {
    e.preventDefault()
    e.stopPropagation()
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(placeName)}`, '_blank')
  }

  const onDeleteClick = () => {
    // Use the item ID for removing from list
    removeListItem({ listId, placeId: place.itemId })
  }

  const handleCardClick = () => {
    navigate(href('/places/:id', { id: place.itemId }))
  }

  return (
    <>
      <div className="relative block px-4 py-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200">
        <button
          aria-label={`View details for ${place.name}`}
          type="button"
          className="flex w-full max-w-full"
          onClick={handleCardClick}
        >
          <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 mr-3">
            {place.imageUrl ? (
              <img src={place.imageUrl} alt={place.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <Star className="text-indigo-400" size={24} />
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 justify-between text-wrap break-words">
            <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">{place.name}</h3>
            <div className="flex items-center">
              <PlaceTypes limit={2} types={place.types || []} />
            </div>
          </div>
        </button>

        <div className="absolute top-3 right-3 z-10 flex gap-1">
          <Button
            type="button"
            className="p-1.5 rounded-full bg-indigo-100 hover:bg-indigo-200 transition-colors"
            onClick={(e: MouseEvent<HTMLButtonElement>) => handleOpenGoogleMaps(e, place.name)}
            aria-label={`Open ${place.name} in Google Maps`}
          >
            <ExternalLink size={14} className="text-indigo-600" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                className="p-1.5 rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <MoreVertical size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border border-gray-200 text-gray-900 shadow-lg">
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault()
                  setIsDeleteModalOpen(true)
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Remove from list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
