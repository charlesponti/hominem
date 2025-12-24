import type { ListPlace } from '@hominem/data'
import { useCallback, useRef, useState } from 'react'
import { href, useNavigate } from 'react-router'
import Alert from '~/components/alert'
import AddPlaceControl from '~/components/lists/add-place-control'
import ListSurface from '../list-surface'
import PlacesListItem from './places-list-item'

interface PlacesListProps {
  places: ListPlace[]
  listId: string
  canAdd?: boolean
  showAvatars?: boolean
}

export default function PlacesList({
  places,
  listId,
  canAdd = true,
  showAvatars = false,
}: PlacesListProps) {
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const navigate = useNavigate()

  const handleDeleteError = useCallback(() => {
    setDeleteError('Could not delete place. Please try again.')
  }, [])

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
            navigate(href('/places/:id', { id: places[selectedIndex].placeId }))
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
          {deleteError && (
            <Alert type="error" dismissible onDismiss={() => setDeleteError(null)}>
              {deleteError}
            </Alert>
          )}
          {places.length === 0 && !isOpen ? (
            <div className="flex flex-col gap-2 items-center justify-center rounded-2xl bg-white/30 p-6">
              <div className="flex flex-col items-center">
                <h3 className="heading-2">No places yet</h3>
                <p className="body-3 text-muted-foreground max-w-md">
                  Start building your list by adding places to see them on the map.
                </p>
              </div>
            </div>
          ) : null}

          {places.length > 0 ? (
            <div onKeyDown={handleKeyDown}>
              <ListSurface ref={listRef} aria-label="Places in list">
                {places.map((place, index) => (
                  <PlacesListItem
                    key={place.id}
                    place={place}
                    listId={listId}
                    onError={handleDeleteError}
                    isSelected={selectedIndex === index}
                    showAvatar={showAvatars}
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
