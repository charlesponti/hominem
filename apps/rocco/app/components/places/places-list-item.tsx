import type { ListPlace } from '@hominem/data'
import { href } from 'react-router'
import { useMapInteraction } from '~/contexts/map-interaction-context'
import PlaceListItemActions from './place-list-item-actions'
import PlaceRow from './place-row'

interface PlacesListItemProps {
  place: ListPlace
  listId: string
  onRemove?: () => void
  onError?: () => void
  isSelected?: boolean
  showAvatar?: boolean
}

const PlaceListItem = ({
  place,
  listId,
  onRemove,
  onError,
  isSelected = false,
  showAvatar = false,
}: PlacesListItemProps) => {
  const { setHoveredPlaceId } = useMapInteraction()

  return (
    <PlaceRow
      name={place.name}
      href={href('/places/:id', { id: place.placeId })}
      photoUrl={place.photos?.[0] ?? null}
      imageUrl={place.imageUrl}
      isSelected={isSelected}
      onMouseEnter={() => setHoveredPlaceId(place.placeId)}
      onMouseLeave={() => setHoveredPlaceId(null)}
      addedBy={showAvatar ? place.addedBy : null}
      accessory={
        <PlaceListItemActions
          placeName={place.name}
          placeId={place.placeId}
          listId={listId}
          onRemove={onRemove}
          onError={onError}
        />
      }
    />
  )
}

export default PlaceListItem
