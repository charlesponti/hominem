import { BookmarkPlus, ChevronsRight, Globe, MoreVertical, Users } from 'lucide-react'
import { Link } from 'react-router'

import ListDeleteButton from '~/components/lists/list-delete-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hominem/ui/components/ui/dropdown-menu'
import type { ExtendedList } from '~/lib/types'

interface ListItemProps {
  list: ExtendedList
  isOwnList: boolean
  'aria-label'?: string
}

function ListItem({ list, isOwnList, 'aria-label': ariaLabel }: ListItemProps) {
  return (
    <li
      data-testid={`list-item-${list.id}`}
      className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4"
      aria-label={ariaLabel}
    >
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
            <Globe size={18} className="text-gray-700" />
          </div>
          <h3 className="text-base font-medium text-gray-900 truncate">
            <span>{list.name}</span>
            <span className="text-gray-400 text-sm flex items-center gap-1">
              <BookmarkPlus size={15} />
              {list.itemCount || 0} {(list.itemCount || 0) === 1 ? 'place' : 'places'}
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-6 text-gray-500 text-base mt-1">
          {list.isPublic && (
            <div className="flex items-center gap-2">
              <Users size={15} className="text-gray-400" />
              <span>Public</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center">
        {isOwnList && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 text-gray-700 transition-colors"
              data-testid={`list-dropdown-${list.id}`}
            >
              <MoreVertical size={18} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border border-border text-gray-900 shadow-lg rounded-xl">
              <DropdownMenuItem asChild>
                <Link
                  to={`/lists/${list.id}/edit`}
                  className="flex w-full items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-50"
                >
                  Edit
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  to={`/lists/${list.id}/invites`}
                  className="flex w-full items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-50"
                >
                  Invites
                </Link>
              </DropdownMenuItem>

              {isOwnList && (
                <DropdownMenuItem>
                  <ListDeleteButton listId={list.id} onDelete={() => {}} />
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Link
          to={`/lists/${list.id}`}
          data-testid={`list-view-button-${list.id}`}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          View
          <ChevronsRight size={17} />
        </Link>
      </div>
    </li>
  )
}

export default ListItem
