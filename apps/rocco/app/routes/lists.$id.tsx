import { useSupabaseAuthContext } from '@hominem/auth'
import { PageTitle } from '@hominem/ui'
import { UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ClientLoaderFunctionArgs } from 'react-router'
import { Link, redirect, useNavigate, useParams } from 'react-router'
import Alert from '~/components/alert'
import ErrorBoundary from '~/components/ErrorBoundary'
import ListMenu from '~/components/lists/list-menu'
import ListTitleEdit from '~/components/lists/list-title-edit'
import Loading from '~/components/loading'
import LazyMap from '~/components/map.lazy'
import PlacesList from '~/components/places/places-list'
import UserAvatar from '~/components/user-avatar'
import { MapInteractionProvider } from '~/contexts/map-interaction-context'
import { useGeolocation } from '~/hooks/useGeolocation'
import { trpc } from '~/lib/trpc/client'
import { createCaller } from '~/lib/trpc/server'
import type { PlaceLocation } from '~/lib/types'
import type { Route } from './+types/lists.$id'

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

export async function loader({ request, params }: Route.LoaderArgs) {
  const { id } = params
  if (!id) {
    throw new Response('List ID is required', { status: 400 })
  }

  const trpcServer = createCaller(request)
  const list = await trpcServer.lists.getById({ id })
  if (!list) {
    return redirect('/404')
  }

  return { list }
}

export default function ListPage({ loaderData }: Route.ComponentProps) {
  const { user } = useSupabaseAuthContext()
  const navigate = useNavigate()
  const params = useParams()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Get listId from params instead of loaderData to work during client-side navigation
  const listId = params.id ?? ''
  const {
    data: list,
    isLoading,
    error,
  } = trpc.lists.getById.useQuery(
    { id: listId },
    { initialData: loaderData?.list ?? undefined, enabled: !!listId }
  )
  const { currentLocation, isLoading: isLoadingLocation } = useGeolocation()

  // Handle redirect when list is not found (after query completes)
  useEffect(() => {
    if (!isLoading && !list && !error && listId) {
      // Query completed but no list found, redirect to 404
      navigate('/404', { replace: true })
    }
  }, [isLoading, list, error, listId, navigate])

  const handleDeleteError = useCallback(() => {
    setDeleteError('Could not delete place. Please try again.')
  }, [])

  // Convert places to map markers (must be called before conditional returns)
  const markers: PlaceLocation[] = useMemo(
    () =>
      (list?.places || [])
        .filter((p) => Boolean(p.latitude && p.longitude))
        .map((p) => ({
          latitude: p.latitude as number,
          longitude: p.longitude as number,
          id: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
        })),
    [list?.places]
  )

  // Show loading state while fetching
  if (isLoading || !listId) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loading size="lg" />
      </div>
    )
  }

  // Show error state
  if (error) {
    return <Alert type="error">Error loading list: {error.message}</Alert>
  }

  // If no list found, show loading (redirect will happen in useEffect)
  if (!list) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loading size="lg" />
      </div>
    )
  }

  const isOwner = list.userId === user?.id
  const hasAccess = list.hasAccess ?? isOwner

  if (deleteError) {
    return <Alert type="error">{deleteError}</Alert>
  }

  return (
    <MapInteractionProvider>
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <PageTitle title={list.name} variant="serif" />
          {isOwner && (
            <div className="flex items-center gap-2">
              <ListTitleEdit listId={list.id} currentName={list.name} />
              <Link to={`/lists/${list.id}/invites`} className="flex items-center gap-2">
                <UserPlus size={18} />
              </Link>
              <ListMenu list={list} isOwnList={isOwner} />
            </div>
          )}
          {!isOwner && (
            <div className="flex items-center">
              <ListMenu list={list} isOwnList={isOwner} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* <ListVisibilityBadge isPublic={data.isPublic} /> */}
          {list.users && list.users.length > 0 && (
            <div className="flex items-center gap-1.5">
              {list.users.slice(0, 5).map((collaborator) => (
                <UserAvatar
                  key={collaborator.id}
                  id={collaborator.id}
                  name={collaborator.name}
                  email={collaborator.email}
                  image={collaborator.image}
                  size="sm"
                />
              ))}
              {list.users.length > 5 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-xs">
                  +{list.users.length - 5}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="overflow-y-auto space-y-4 pb-8">
          <PlacesList
            places={list.places || []}
            listId={list.id}
            canAdd={hasAccess}
            onError={handleDeleteError}
            showAvatars={(list.users?.length ?? 0) > 1}
          />
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
