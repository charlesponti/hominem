import type { ListPlace } from '@hominem/data'
import { MapPin } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { href, useNavigate } from 'react-router'
import AddPlaceControl from '~/components/lists/add-place-control'
import ListSurface from '../list-surface'
import PlaceItem from './place-item'

interface PlacesListProps {
  places: ListPlace[]
  listId: string
  canAdd?: boolean
  onError?: () => void
}

export default function PlacesList({ places, listId, canAdd = true, onError }: PlacesListProps) {
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const listRef = useRef<HTMLUListElement>(null)
  const navigate = useNavigate()

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!places.length) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev < places.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : places.length - 1))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && places[selectedIndex]) {
            navigate(href('/places/:id', { id: places[selectedIndex].itemId }))
          }
          break
        case 'Escape':
          setSelectedIndex(-1)
          break
      }
    },
    [places, selectedIndex, navigate]
  )

  return (
    <AddPlaceControl listId={listId} canAdd={canAdd}>
      {({ isOpen }) => (
        <>
          {places.length === 0 && !isOpen ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 md:p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <MapPin className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No places yet</h3>
              <p className="text-gray-600 mb-6 max-w-md">
                Start building your list by adding places to see them on the map.
              </p>
            </div>
          ) : null}

          {places.length > 0 ? (
            <div onKeyDown={handleKeyDown}>
              <ListSurface
                ref={listRef}
                className="divide-gray-200 bg-white rounded-xl shadow-sm border border-border"
                aria-label="Places in list"
              >
                {places.map((place, index) => (
                  <PlaceItem
                    key={place.id}
                    place={place}
                    listId={listId}
                    onError={onError}
                    isSelected={selectedIndex === index}
                  />
                ))}
              </ListSurface>
            </div>
          ) : null}
        </>
      )}
    </AddPlaceControl>
  )
}
