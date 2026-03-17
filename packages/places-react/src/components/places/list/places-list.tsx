import type { ListPlace } from '@hominem/lists-services'
import { Alert, Stack } from '@hominem/ui'
import { List } from '@hominem/ui/list'
import { type ReactNode, useCallback, useState } from 'react'
import { href } from 'react-router'

import PlaceListItemActions from './place-list-item-actions'
import PlaceRow from './place-row'

interface PlacesListProps {
  places: ListPlace[]
  listId: string
  /** Slot for the add-place control (e.g. AddPlaceControl from lists-react) */
  addPlaceControl?: ReactNode
  /** Called when a place row is hovered; receives placeId or null on leave */
  onHoverPlace?: (placeId: string | null) => void
}

export default function PlacesList({
  places,
  listId,
  addPlaceControl,
  onHoverPlace,
}: PlacesListProps) {
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteError = useCallback(() => {
    setDeleteError('Delete failed. Retry.')
  }, [])

  const handleMouseEnter = useCallback(
    (placeId: string) => onHoverPlace?.(placeId),
    [onHoverPlace],
  )

  const handleMouseLeave = useCallback(() => onHoverPlace?.(null), [onHoverPlace])

  return (
    <>
      {addPlaceControl}
      {deleteError && <Alert variant="destructive">{deleteError}</Alert>}
      {places.length === 0 ? (
        <Stack gap="sm" className="items-center justify-center p-6">
          <Stack gap="none" className="items-center">
            <h3 className="heading-2">No places yet</h3>
            <p className="body-3 text-muted-foreground max-w-md">
              Start building your list by adding places to see them on the map.
            </p>
          </Stack>
        </Stack>
      ) : null}

      {places.length > 0 ? (
        <List aria-label="Places in list">
          {places.map((place) => (
            <PlaceRow
              key={place.placeId}
              name={place.name}
              href={href('/places/:id', { id: place.placeId })}
              photoUrl={place.photos?.[0] ?? null}
              imageUrl={place.imageUrl}
              onMouseEnter={() => handleMouseEnter(place.placeId)}
              onMouseLeave={handleMouseLeave}
              addedBy={place.addedBy ?? null}
              accessory={
                <PlaceListItemActions
                  placeName={place.name}
                  placeId={place.placeId}
                  listId={listId}
                  onError={handleDeleteError}
                />
              }
            />
          ))}
        </List>
      ) : null}
    </>
  )
}

export { PlacesList }
