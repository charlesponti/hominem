import { useSupabaseAuthContext } from '@hominem/auth'
import { List } from '@hominem/ui/list'
import { memo } from 'react'
import { ListRow } from '~/components/lists/list-row'
import AddPlaceToList from '~/components/places/add-to-list-control'
import { trpc } from '~/lib/trpc/client'
import type { PlaceWithLists } from '~/lib/types'

type Props = {
  place: PlaceWithLists
}

const PlaceLists = ({ place }: Props) => {
  const { isAuthenticated } = useSupabaseAuthContext()

  const resolvedPlaceId = place.id
  const googleMapsId = place.googleMapsId

  const { data: listsContainingPlace = [], isLoading } = trpc.lists.getContainingPlace.useQuery(
    {
      placeId: resolvedPlaceId || undefined,
      googleMapsId: googleMapsId || undefined,
    },
    {
      enabled: isAuthenticated && Boolean(resolvedPlaceId || googleMapsId),
    }
  )

  if (!isAuthenticated) {
    return null
  }

  return (
    <div data-testid="place-lists" className="space-y-1">
      <div className="flex items-center justify-between">
        <h3 className="heading-2 font-light">Lists</h3>
        <AddPlaceToList placeId={place.id} />
      </div>

      {(isLoading || listsContainingPlace.length > 0) && (
        <List isLoading={isLoading} loadingSize="md">
          {listsContainingPlace.map((list) => (
            <ListRow
              key={list.id}
              id={list.id}
              name={list.name}
              count={list.itemCount || 0}
              imageUrl={list.imageUrl}
              imageAlt={list.name}
            />
          ))}
        </List>
      )}
    </div>
  )
}

export default memo(PlaceLists)
