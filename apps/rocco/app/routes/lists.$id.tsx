import type { User } from '@supabase/supabase-js'
import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import type { ClientLoaderFunctionArgs } from 'react-router'
import { Link, redirect, useParams, useRouteLoaderData } from 'react-router'
import Alert from '~/components/alert'
import ErrorBoundary from '~/components/ErrorBoundary'
import ListMenu from '~/components/lists/list-menu'
import ListTitle from '~/components/lists/list-title'
import ListVisibilityBadge from '~/components/lists/list-visibility-badge'
import Loading, { LoadingScreen } from '~/components/loading'
import LazyMap from '~/components/map.lazy'
import PlacesList from '~/components/places/places-list'
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
  const { currentLocation, isLoading: isLoadingLocation } = useGeolocation()

  const handleDeleteError = () => {
    setDeleteError('Could not delete place. Please try again.')
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!data) {
    return <Alert type="error">We could not find this list.</Alert>
  }

  if (deleteError) {
    return <Alert type="error">{deleteError}</Alert>
  }

  const isOwner = data.userId === user?.id
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
      <div className="flex flex-col gap-4 w-full">
        <div className="flex-1 space-y-2">
          <div className="flex justify-between items-center">
            <ListTitle list={data} isOwner={isOwner} />
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
          <ListVisibilityBadge isPublic={data.isPublic} />
        </div>
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          <div className="overflow-y-auto space-y-4 pb-8">
            {data && (
              <PlacesList
                places={data.places || []}
                listId={data.id}
                listName={data.name}
                canAdd={isOwner}
                onError={handleDeleteError}
              />
            )}
          </div>

          <div className="min-h-[300px] rounded-lg overflow-hidden">
            <LazyMap
              isLoadingCurrentLocation={isLoadingLocation}
              currentLocation={currentLocation}
              zoom={12}
              center={mapCenter}
              markers={markers}
            />
          </div>
        </div>
      </div>
    </MapInteractionProvider>
  )
}

export { ErrorBoundary }
