import { useSupabaseAuthContext } from '@hominem/auth'
import { PageTitle } from '@hominem/ui'
import { UserPlus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, redirect } from 'react-router'
import Alert from '~/components/alert'
import ErrorBoundary from '~/components/ErrorBoundary'
import ListEditButton from '~/components/lists/list-edit-button'
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

export async function loader({ request, params }: Route.LoaderArgs) {
  const { id } = params
  if (!id) {
    return redirect('/404')
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

  const listId = loaderData.list.id

  const {
    data: list,
    isLoading,
    error,
  } = trpc.lists.getById.useQuery(
    { id: listId },
    {
      initialData: loaderData.list,
      enabled: !!listId,
      staleTime: 1000 * 60,
    }
  )
  const { currentLocation, isLoading: isLoadingLocation } = useGeolocation()

  const markers: PlaceLocation[] = useMemo(
    () =>
      list.places
        .filter((p) => Boolean(p.latitude && p.longitude))
        .map((p) => ({
          latitude: p.latitude as number,
          longitude: p.longitude as number,
          id: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
        })),
    [list.places]
  )

  // Show loading state only on initial load
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loading size="lg" />
      </div>
    )
  }

  const isOwner = list.userId === user?.id
  const hasAccess = list.hasAccess ?? isOwner

  return (
    <MapInteractionProvider>
      <div className="space-y-4">
        <div className="flex-1 space-y-2">
          {error && (
            <Alert type="error" dismissible>
              Error loading list updates: {error.message}
            </Alert>
          )}
          <div
            className="flex justify-between items-center"
            style={{ viewTransitionName: `list-title-${list.id}` }}
          >
            <PageTitle title={list.name} />
            {isOwner && (
              <div className="flex items-center gap-2">
                <Link to={`/lists/${list.id}/invites`} className="flex items-center gap-2">
                  <UserPlus size={18} />
                </Link>
                <ListEditButton list={list} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* <ListVisibilityBadge isPublic={data.isPublic} /> */}
            {list.users && list.users.length > 0 && (
              <div className="flex items-center -space-x-2">
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
                  <div className="flex size-6 items-center justify-center rounded-full border border-border bg-muted text-xs">
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
              places={list.places}
              listId={list.id}
              canAdd={hasAccess}
              showAvatars={(list.users?.length ?? 0) > 1}
            />
          </div>

          <div className="min-h-[300px] overflow-hidden">
            <LazyMap
              isLoadingCurrentLocation={isLoadingLocation}
              currentLocation={currentLocation}
              zoom={12}
              markers={markers}
            />
          </div>
        </div>
      </div>
    </MapInteractionProvider>
  )
}

export { ErrorBoundary }
