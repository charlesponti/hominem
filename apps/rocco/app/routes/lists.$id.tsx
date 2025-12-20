import { useSupabaseAuthContext } from '@hominem/auth'
import { PageTitle } from '@hominem/ui'
import { UserPlus } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, redirect, data } from 'react-router'
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

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent')

  if (intent === 'update-name') {
    const name = formData.get('name') as string
    const id = params.id
    if (!id || !name) {
      return data({ error: 'ID and name are required' }, { status: 400 })
    }

    const trpcServer = createCaller(request)
    try {
      await trpcServer.lists.update({ id, name })
      return { success: true }
    } catch (error) {
      return data(
        { error: error instanceof Error ? error.message : 'Update failed' },
        { status: 500 }
      )
    }
  }

  return null
}

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
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
      <div className="space-y-4">
        <div className="flex-1 space-y-2">
          <div
            className="flex justify-between items-center"
            style={{ viewTransitionName: `list-title-${list.id}` }}
          >
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
      </div>
    </MapInteractionProvider>
  )
}

export { ErrorBoundary }
