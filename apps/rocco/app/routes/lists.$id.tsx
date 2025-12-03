import type { User } from '@supabase/supabase-js'
import { MapPin, PlusCircle, UserPlus } from 'lucide-react'
import { useState } from 'react'
import type { ClientLoaderFunctionArgs } from 'react-router'
import { Link, redirect, useParams, useRouteLoaderData } from 'react-router'
import Alert from '~/components/alert'
import ErrorBoundary from '~/components/ErrorBoundary'
import AddPlacePanel from '~/components/lists/add-place-panel'
import ListMenu from '~/components/lists/list-menu'
import ListTitle from '~/components/lists/list-title'
import ListVisibilityBadge from '~/components/lists/list-visibility-badge'
import Loading from '~/components/loading'
import LazyMap from '~/components/map.lazy'
import PlacesList from '~/components/places/places-list'
import { Button } from '~/components/ui/button'
import { MapInteractionProvider } from '~/contexts/map-interaction-context'
import { useGeolocation } from '~/hooks/useGeolocation'
import { trpc } from '~/lib/trpc/client'
import type { PlaceLocation } from '~/lib/types'

export const clientLoader = async ({ params }: ClientLoaderFunctionArgs) => {
  if (!params.id) {
    return redirect('/404')
  }

  // For now, return empty data and let the client fetch with tRPC
  return { list: null }
}

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center h-32">
      <Loading size="lg" />
    </div>
  )
}

// Default center (San Francisco) when no places or location available
const DEFAULT_CENTER: PlaceLocation = {
  latitude: 37.7749,
  longitude: -122.4194,
}

export default function ListPage() {
  const { user } = useRouteLoaderData('routes/layout') as {
    user: User | null
    isAuthenticated: boolean
  }
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const params = useParams<{ id: string }>()
  const { data: listData, isLoading } = trpc.lists.getById.useQuery({
    id: params.id || '',
  })
  const data = listData || null
  const [isAddToListOpen, setIsAddToListOpen] = useState(false)
  const { currentLocation, isLoading: isLoadingLocation } = useGeolocation()

  const handleDeleteError = () => {
    setDeleteError('Could not delete place. Please try again.')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loading size="lg" />
      </div>
    )
  }

  if (!data) {
    return <Alert type="error">We could not find this list.</Alert>
  }

  if (deleteError) {
    return <Alert type="error">{deleteError}</Alert>
  }

  const isOwner = data.userId === user?.id
  const placeCount = data.places?.length || 0

  // Convert places to map markers
  const markers: PlaceLocation[] = (data.places || [])
    .filter((p) => Boolean(p.latitude && p.longitude))
    .map((p) => ({
      latitude: p.latitude as number,
      longitude: p.longitude as number,
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
    }))

  // Calculate map center: first place, current location, or default
  const mapCenter: PlaceLocation =
    markers.length > 0
      ? markers[0]
      : currentLocation
        ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude }
        : DEFAULT_CENTER

  return (
    <MapInteractionProvider>
      {/* Add Place Panel */}
      <AddPlacePanel
        isOpen={isAddToListOpen}
        onClose={() => setIsAddToListOpen(false)}
        listId={data.id}
        listName={data.name}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
        {/* List content - left on desktop, top on mobile */}
        <div className="overflow-y-auto space-y-4 pb-8">
          {data && (
            <>
              {/* Hero Section */}
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  {/* Title and Metadata */}
                  <div className="flex-1">
                    <ListTitle list={data} isOwner={isOwner} />
                    <ListVisibilityBadge isPublic={data.isPublic} />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isOwner && (
                      <Link to={`/lists/${data.id}/invites`} className="flex items-center gap-2">
                        <UserPlus size={18} />
                      </Link>
                    )}

                    <div className="flex items-center">
                      <ListMenu list={data} isOwnList={isOwner} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Empty State */}
              {placeCount === 0 && !isAddToListOpen && (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-6 md:p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                    <MapPin className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No places yet</h3>
                  <p className="text-gray-600 mb-6 max-w-md">
                    Start building your list by adding places to see them on the map.
                  </p>
                </div>
              )}

              {/* Add Place Button */}
              <div className="flex flex-col gap-2">
                {isOwner && !isAddToListOpen && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      data-testid="add-to-list-button"
                      onClick={() => setIsAddToListOpen(!isAddToListOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
                    >
                      <PlusCircle size={18} />
                      <span>Add Place</span>
                    </Button>
                  </div>
                )}

                {/* Places List */}
                {placeCount > 0 && data.places && (
                  <PlacesList places={data.places} listId={data.id} onError={handleDeleteError} />
                )}
              </div>
            </>
          )}
        </div>

        <div className="h-[300px] lg:h-full min-h-[300px] rounded-lg overflow-hidden">
          <LazyMap
            isLoadingCurrentLocation={isLoadingLocation}
            currentLocation={currentLocation}
            zoom={12}
            center={mapCenter}
            markers={markers}
          />
        </div>
      </div>
    </MapInteractionProvider>
  )
}

export { ErrorBoundary }
