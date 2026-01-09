import type { ListPlace } from '@hominem/data/lists'
import { Alert } from '@hominem/ui'
import { List } from '@hominem/ui/list'
import { useCallback, useState } from 'react'
import { href } from 'react-router'
import AddPlaceControl from '~/components/lists/add-place-control'
import { useMapInteraction } from '~/contexts/map-interaction-context'
import PlaceListItemActions from './place-list-item-actions'
import PlaceRow from './place-row'

interface PlacesListProps {
  places: ListPlace[]
  listId: string
  canAdd?: boolean
}

export default function PlacesList({ places, listId, canAdd = true }: PlacesListProps) {
  const { setHoveredPlaceId } = useMapInteraction()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteError = useCallback(() => {
    setDeleteError('Could not delete place. Please try again.')
  }, [])

  return (
    <>
      <AddPlaceControl listId={listId} canAdd={canAdd} />
      {deleteError && (
        <Alert type="error" dismissible onDismiss={() => setDeleteError(null)}>
          {deleteError}
        </Alert>
      )}
      {places.length === 0 ? (
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
        <List aria-label="Places in list">
          {places.map((place) => (
            <PlaceRow
              key={place.placeId}
              name={place.name}
              href={href('/places/:id', { id: place.placeId })}
              photoUrl={place.photos?.[0] ?? null}
              imageUrl={place.imageUrl}
              onMouseEnter={() => setHoveredPlaceId(place.placeId)}
              onMouseLeave={() => setHoveredPlaceId(null)}
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
