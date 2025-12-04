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
}

const SocialProofSection = ({ lists }: Props) => {
  if (lists.length === 0) {
    return null
  }

  return (
    <div className="space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <h3 className="font-sans font-semibold">
        Saved in {lists.length} {lists.length === 1 ? 'list' : 'lists'}
      </h3>

      <ul className="list-none divide-y divide-gray-200 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {lists.map((list) => (
          <li key={list.id} className="relative hover:cursor-pointer">
            <Link
              to={`/lists/${list.id}`}
              className="flex justify-between items-center p-2 w-full group"
            >
              <div className="flex items-center gap-3">
                <span className="shrink-0 size-7 rounded bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-200">
                  <List size={18} className="text-gray-600" />
                </span>
                <span className="font-medium text-gray-900 truncate text-sm group-hover:text-indigo-600 transition-colors">
                  {list.name}
                </span>
              </div>
              {list.itemCount !== undefined && (
                <span className="text-xs text-gray-500 ml-2">
                  {list.itemCount} {list.itemCount === 1 ? 'place' : 'places'}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default memo(SocialProofSection)
