import type { ListPlace } from '@hominem/data'
import { useCallback, useRef, useState } from 'react'
import { href, useNavigate } from 'react-router'
import PlaceItem from './place-item'

interface PlacesListProps {
  places: ListPlace[]
  listId: string
  onError?: () => void
}

export default function PlacesList({ places, listId, onError }: PlacesListProps) {
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
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      <ul ref={listRef} className="divide-y divide-gray-200" aria-label="Places in list">
        {places.map((place, index) => (
          <PlaceItem
            key={place.id}
            place={place}
            listId={listId}
            onError={onError}
            isSelected={selectedIndex === index}
          />
        ))}
      </ul>
    </div>
  )
}
