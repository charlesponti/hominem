import { useSupabaseAuthContext } from '@hominem/ui'
import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { trpc } from '~/lib/trpc/client'
import ListSurface from '../list-surface'
import Loading from '../loading'

export default function Lists() {
  const { isAuthenticated, isLoading: authLoading } = useSupabaseAuthContext()

  const {
    data: lists = [],
    isLoading,
    error,
  } = trpc.lists.getAll.useQuery(undefined, { enabled: isAuthenticated && !authLoading })

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl tracking-tight font-light text-gray-900">Lists</h2>
        <Link
          to="/lists/create"
          className="self-start flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-hover active:bg-primary-hover text-primary-foreground text-sm font-medium rounded-md transition-colors"
        >
          <Plus size={16} className="inline" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loading size="lg" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600">Error loading lists: {error.message}</p>
        </div>
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <h3 className="text-lg font-semibold text-gray-900">No lists yet</h3>
          <p className="mt-1 text-sm text-gray-600">Get started by creating your first list.</p>
        </div>
      ) : (
        <ListSurface>
          {lists.map((list) => (
            <li key={list.id}>
              <Link
                to={`/lists/${list.id}`}
                viewTransition
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="flex-1 heading-3 text-accent-foreground truncate">{list.name}</h3>
                  <span className="bg-accent text-accent-foreground text-sm rounded-full px-2.5 py-1">
                    {list.places.length || 0}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ListSurface>
      )}
    </div>
  )
}
