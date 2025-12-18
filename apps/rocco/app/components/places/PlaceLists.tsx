import { useSupabaseAuthContext } from '@hominem/auth'
import { memo } from 'react'
import z from 'zod'
import ListSurface from '~/components/list-surface'
import { ListRow } from '~/components/lists/list-row'
import Loading from '~/components/loading'
import AddPlaceToList from '~/components/places/add-to-list-control'
import { env } from '~/lib/env'
import { trpc } from '~/lib/trpc/client'

const buildImageUrl = (src?: string | null, width = 400, height = 300) => {
  if (!src) return null

  if (src.includes('places/') && src.includes('/photos/')) {
    return `https://places.googleapis.com/v1/${src}/media?key=${env.VITE_GOOGLE_API_KEY}&maxWidthPx=${width}&maxHeightPx=${height}`
  }

  if (src.includes('googleusercontent')) {
    return `${src}=w${width}-h${height}-c`
  }

  return src
}

type Props = {
  placeId: string
}

const PlaceLists = ({ placeId }: Props) => {
  const { isAuthenticated } = useSupabaseAuthContext()
  const isUuid = z.uuid().safeParse(placeId).success

  // Fetch place details to get googleMapsId if needed
  const { data: placeDetails } = trpc.places.getDetailsById.useQuery(
    { id: placeId },
    {
      enabled: isAuthenticated && isUuid,
    }
  )

  const { data: placeDetailsByGoogleId } = trpc.places.getDetailsByGoogleId.useQuery(
    { googleMapsId: placeId },
    {
      enabled: isAuthenticated && !isUuid,
    }
  )

  const place = placeDetails || placeDetailsByGoogleId
  const resolvedPlaceId = isUuid ? placeId : place?.id
  const googleMapsId = isUuid ? place?.googleMapsId : placeId

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
    <div data-testid="place-lists" className="space-y-1 pb-10">
      <div className="flex items-center justify-between">
        <h3 className="heading-2 font-light">Lists</h3>
        {place && <AddPlaceToList placeId={placeId} />}
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
