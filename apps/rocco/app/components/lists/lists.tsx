import { trpc } from '~/lib/trpc/client'
import ListSurface from '../list-surface'
import Loading from '../loading'
import ListForm from './list-form'
import { ListRow } from './list-row'

export default function Lists() {
  const { data: lists = [], isLoading, error } = trpc.lists.getAll.useQuery()

  const title = <h2 className="heading-2">Lists</h2>

  if (isLoading) {
    return (
      <div className="space-y-2">
        {title}
        <div className="flex items-center justify-center h-32">
          <Loading size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        {title}
        <div className="text-center py-8">
          <p className="text-red-600">Error loading lists: {error.message}</p>
        </div>
      </div>
    )
  }

  if (lists.length === 0) {
    return (
      <div className="space-y-2">
        {title}
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <h3 className="text-lg font-semibold text-gray-900">No lists yet</h3>
          <p className="mt-1 text-sm text-gray-600">Get started by creating your first list.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {title}

      <ListSurface>
        {lists.map((list) => (
          <ListRow key={list.id} id={list.id} name={list.name} count={list.places.length || 0} />
        ))}
      </ListSurface>
      <ListForm onCreate={() => {}} onCancel={() => {}} />
    </div>
  )
}
