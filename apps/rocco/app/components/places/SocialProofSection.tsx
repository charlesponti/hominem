import { List } from 'lucide-react'
import { Link } from 'react-router'
import { memo } from 'react'

type PlaceList = {
  id: string
  name: string
  itemCount?: number
}

type Props = {
  lists: PlaceList[]
  placeName: string
}

const SocialProofSection = ({ lists, placeName }: Props) => {
  if (lists.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with count */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-700">
          Saved in {lists.length} {lists.length === 1 ? 'list' : 'lists'}
        </h3>
      </div>

      {/* Lists grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {lists.map((list) => {
          return (
            <Link
              key={list.id}
              to={`/lists/${list.id}`}
              className="group flex items-center gap-3 rounded-lg p-3 bg-white border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Icon */}
              <div className="shrink-0 size-9 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-200">
                <List size={16} className="text-gray-600" />
              </div>

              {/* List info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate text-sm group-hover:text-indigo-600 transition-colors">
                  {list.name}
                </div>
                {list.itemCount !== undefined && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {list.itemCount} {list.itemCount === 1 ? 'place' : 'places'}
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default memo(SocialProofSection)
