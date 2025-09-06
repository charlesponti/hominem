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
import styles from './place-item.module.css'

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
      <div className={`${styles.placeCard} group cursor-pointer`}>
        <button
          aria-label={`View details for ${place.name}`}
          type="button"
          className="flex w-full max-w-full p-3"
          onClick={handleCardClick}
        >
          <div className={styles.imageContainer}>
            {place.imageUrl ? (
              <img src={place.imageUrl} alt={place.name} className="w-full h-32 object-cover" />
            ) : (
              <div className="w-full h-32 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <Star className="text-indigo-400" size={32} />
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 h-full justify-between text-wrap break-words">
            <p
              className={`${styles.placeName} font-semibold text-start text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors`}
            >
              {place.name}
            </p>
            <div className="flex items-center mt-1">
              <PlaceTypes limit={2} types={place.types || []} />
            </div>
          </div>
        </button>

        <div className="absolute top-3 right-3 z-10">
          <Button
            type="button"
            className="ml-2 p-1.5 rounded-full bg-indigo-100 hover:bg-indigo-200 transition-colors"
            onClick={(e: MouseEvent<HTMLButtonElement>) => handleOpenGoogleMaps(e, place.name)}
            aria-label={`Open ${place.name} in Google Maps`}
          >
            <ExternalLink size={14} className="text-indigo-600" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                className="bg-white/90 backdrop-blur-sm rounded-full p-1.5 text-gray-700 hover:bg-white transition-colors shadow-sm"
                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <MoreVertical size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border border-gray-200 text-gray-900 backdrop-blur-md shadow-lg">
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
          className="bg-white border-l border-gray-200 text-gray-900 backdrop-blur-md"
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
                className={styles.deleteButton}
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
