import AppLink from 'src/components/AppLink'
import type { List } from 'src/lib/types'

import ListMenu from './list-menu'

export default function ListItem({
  list,
  isOwnList,
}: {
  list: List & { createdBy: { email: string } }
  isOwnList: boolean
}) {
  return (
    <li key={list.id} className="flex">
      <AppLink
        className="flex justify-between items-center p-3 text-lg border rounded-md w-full"
        to={`/list/${list.id}`}
      >
        {list.name}

        <span className="flex items-center gap-2">
          {/* Only display list owner if the list does not belong to current user */}
          {isOwnList ? <p className="text-xs text-gray-400">{list.createdBy.email}</p> : null}
          <ListMenu list={list} isOwnList={isOwnList} />
        </span>
      </AppLink>
    </li>
  )
}
