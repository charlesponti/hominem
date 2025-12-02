import { Plus } from 'lucide-react'
import { Link, useRouteLoaderData } from 'react-router'
import { trpc } from '~/lib/trpc/client'
import Loading from '../loading'

export default function Lists() {
  const layoutData = useRouteLoaderData('routes/layout') as { isAuthenticated: boolean } | undefined
  const isAuthenticated = layoutData?.isAuthenticated ?? false

  const {
    data: lists = [],
    isLoading,
    error,
  } = trpc.lists.getAll.useQuery(undefined, { enabled: isAuthenticated })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Lists</h2>
        <Link
          to="/lists/create"
          className="self-start px-4 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} className="inline mr-1" />
          New List
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
          <Link
            to="/lists/create"
            className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Create a list
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {lists.map((list) => (
              <li key={list.id}>
                <Link
                  to={`/lists/${list.id}`}
                  className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{list.name}</h3>
                    <p className="text-gray-600 text-sm">
                      {list.places.length || 0}{' '}
                      {(list.places.length || 0) === 1 ? 'place' : 'places'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {list.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
