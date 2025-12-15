import { useSupabaseAuth } from '@hominem/ui'
import { Avatar, AvatarFallback, AvatarImage } from '@hominem/ui/components/ui/avatar'
import { UserPlus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import type { ClientLoaderFunctionArgs } from 'react-router'
import { Link, redirect, useParams } from 'react-router'
import Alert from '~/components/alert'
import ErrorBoundary from '~/components/ErrorBoundary'
import ListMenu from '~/components/lists/list-menu'
import ListTitleEdit from '~/components/lists/list-title-edit'
// import ListVisibilityBadge from '~/components/lists/list-visibility-badge'
import Loading, { LoadingScreen } from '~/components/loading'
import LazyMap from '~/components/map.lazy'
import PageTitle from '~/components/page-title'
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

export default function ListPage() {
  const { user } = useSupabaseAuth()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const params = useParams<{ id: string }>()
  const { data: listData, isLoading } = trpc.lists.getById.useQuery({
    id: params.id || '',
  })
  const data = listData || null
  const { currentLocation, isLoading: isLoadingLocation } = useGeolocation()

  const handleDeleteError = useCallback(() => {
    setDeleteError('Could not delete place. Please try again.')
  }, [])

  const isOwner = data?.userId === user?.id
  const hasAccess = data?.hasAccess ?? isOwner
  // Convert places to map markers
  const markers: PlaceLocation[] = useMemo(
    () =>
      (data?.places || [])
        .filter((p) => Boolean(p.latitude && p.longitude))
        .map((p) => ({
          latitude: p.latitude as number,
          longitude: p.longitude as number,
          id: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
        })),
    [data?.places]
  )

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!data) {
    return <Alert type="error">We could not find this list.</Alert>
  }

  if (deleteError) {
    return <Alert type="error">{deleteError}</Alert>
  }

  return (
    <MapInteractionProvider>
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <PageTitle title={data.name} variant="serif" />
          {isOwner && (
            <div className="flex items-center gap-2">
              <ListTitleEdit listId={data.id} currentName={data.name} />
              <Link to={`/lists/${data.id}/invites`} className="flex items-center gap-2">
                <UserPlus size={18} />
              </Link>
              <ListMenu list={data} isOwnList={isOwner} />
            </div>
          )}
          {!isOwner && (
            <div className="flex items-center">
              <ListMenu list={data} isOwnList={isOwner} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* <ListVisibilityBadge isPublic={data.isPublic} /> */}
          {data.users && data.users.length > 0 && (
            <div className="flex items-center gap-1.5">
              {data.users.slice(0, 5).map((collaborator) => (
                <Avatar
                  key={collaborator.id}
                  className="h-6 w-6 border border-border"
                  title={collaborator.name || collaborator.email}
                >
                  <AvatarImage
                    src={collaborator.image || undefined}
                    alt={collaborator.name || collaborator.email}
                  />
                  <AvatarFallback className="text-xs">
                    {(collaborator.name || collaborator.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {data.users.length > 5 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-xs">
                  +{data.users.length - 5}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="overflow-y-auto space-y-4 pb-8">
          {data && (
            <PlacesList
              places={data.places || []}
              listId={data.id}
              canAdd={hasAccess}
              onError={handleDeleteError}
              showAvatars={(data.users?.length ?? 0) > 1}
            />
          )}
        </div>

        <div className="min-h-[300px] rounded-lg overflow-hidden">
          <LazyMap
            isLoadingCurrentLocation={isLoadingLocation}
            currentLocation={currentLocation}
            zoom={12}
            markers={markers}
          />
        </div>
      </div>
    </MapInteractionProvider>
  )
}

export { ErrorBoundary }
