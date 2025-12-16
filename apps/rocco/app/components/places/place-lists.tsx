import { useSupabaseAuthContext } from '@hominem/ui'
import { List } from 'lucide-react'
import { memo } from 'react'
import { Link } from 'react-router'
import ListSurface from '~/components/list-surface'
import Loading from '~/components/loading'
import { env } from '~/lib/env'
import { trpc } from '~/lib/trpc/client'
import type { PlaceWithLists } from '~/lib/types'

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
  place: PlaceWithLists
}

const PlaceLists = ({ place }: Props) => {
  const { isAuthenticated, isLoading: authLoading } = useSupabaseAuthContext()

  const { data: listsContainingPlace = [], isLoading } = trpc.lists.getContainingPlace.useQuery(
    {
      placeId: place.id || undefined,
      googleMapsId: place.googleMapsId || undefined,
    },
    {
      enabled: isAuthenticated && !authLoading && (!!place.id || !!place.googleMapsId),
    }
  )

  // Don't show section if not loading and no lists
  if (!isLoading && listsContainingPlace.length === 0) {
    return null
  }

  return (
    <div className="space-y-1 pb-10">
      <h3 className="heading-2 font-light">Lists</h3>

      <ListSurface>
        {isLoading ? (
          <li className="flex items-center justify-center py-8">
            <Loading size="md" />
          </li>
        ) : (
          listsContainingPlace.map((list) => {
            const resolvedThumbnail = buildImageUrl(list.imageUrl, 80, 80)

            return (
              <li key={list.id}>
                <Link
                  to={`/lists/${list.id}`}
                  viewTransition
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="size-12 rounded overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
                        {resolvedThumbnail ? (
                          <img
                            src={resolvedThumbnail}
                            alt={list.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <List className="text-gray-400" size={20} />
                        )}
                      </div>
                      <h3 className="flex-1 heading-3 text-accent-foreground truncate">
                        {list.name}
                      </h3>
                    </div>
                    <span className="bg-accent text-accent-foreground text-sm rounded-full px-2.5 py-1 shrink-0">
                      {list.itemCount || 0}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })
        )}
      </ListSurface>
    </div>
  )
}

export default memo(PlaceLists)
