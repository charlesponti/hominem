import type { User } from '@supabase/supabase-js'
import { PlusCircle, Share } from 'lucide-react'
import { useState } from 'react'
import type { ClientLoaderFunctionArgs } from 'react-router'
import { Link, redirect, useParams, useRouteLoaderData } from 'react-router'
import Alert from '~/components/alert'
import ErrorBoundary from '~/components/ErrorBoundary'
import ListMenu from '~/components/lists-components/list-menu'
import Loading from '~/components/loading'
import PlaceItem from '~/components/places/place-item'

import { trpc } from '~/lib/trpc/client'

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

  return (
    <div>
      {data && (
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-semibold">{data.name}</h1>
            <div className="flex gap-2">
              {/* Only list owners can invite others. */}
              {data.userId === user?.id && !isAddToListOpen && (
                <button
                  type="button"
                  data-testid="add-to-list-button"
                  onClick={() => setIsAddToListOpen(!isAddToListOpen)}
                  className="flex gap-2 text-black hover:bg-opacity-80 focus:bg-opacity-80 cursor-pointer p-1"
                >
                  <PlusCircle size={20} />
                </button>
              )}
              {/* Only list owners can share with others. */}
              {data.userId === user?.id && (
                <Link
                  to={`/lists/${data.id}/invites`}
                  className="flex gap-2 text-black hover:bg-opacity-80 focus:bg-opacity-80 p-1"
                >
                  <Share className="hover:cursor-pointer" size={20} />
                </Link>
              )}
              <ListMenu list={data} isOwnList={data.userId === user?.id} />
            </div>
          </div>
          {data.places?.length === 0 && !isAddToListOpen && (
            <Alert type="info">
              This list is empty. Start adding places with the search bar above.
            </Alert>
          )}
          {data.places && data.places.length > 0 && (
            <div className="space-y-4">
              {data.places.map((place) => {
                return (
                  <PlaceItem
                    key={place.id}
                    place={place}
                    listId={data.id}
                    onError={handleDeleteError}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { ErrorBoundary }
