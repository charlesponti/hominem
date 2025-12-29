import { useSupabaseAuthContext } from '@hominem/auth'
import { memo } from 'react'
import ListSurface from '~/components/list-surface'
import { ListRow } from '~/components/lists/list-row'
import Loading from '~/components/loading'
import AddPlaceToList from '~/components/places/add-to-list-control'
import { trpc } from '~/lib/trpc/client'
import type { PlaceWithLists } from '~/lib/types'
import { buildImageUrl } from '~/lib/utils'

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

      {listsContainingPlace.length > 0 && (
        <ListSurface>
          {isLoading ? (
            <li className="flex items-center justify-center py-8">
              <Loading size="md" />
            </li>
          ) : (
            listsContainingPlace.map((list) => {
              const resolvedThumbnail = buildImageUrl(list.imageUrl, 80, 80)

              return (
                <ListRow
                  key={list.id}
                  id={list.id}
                  name={list.name}
                  count={list.itemCount || 0}
                  imageUrl={resolvedThumbnail}
                  imageAlt={list.name}
                />
              )
            })
          )}
        </ListSurface>
      )}
    </div>
  )
}

export default memo(PlaceLists)
