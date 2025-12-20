import { List } from 'lucide-react'
import { Link } from 'react-router'
import { trpc } from '~/lib/trpc/client'

type ListRowProps = {
  id: string
  name: string
  count: number
  imageUrl?: string | null
  imageAlt?: string
}

export function ListRow({ id, name, count, imageUrl, imageAlt }: ListRowProps) {
  const utils = trpc.useUtils()

  return (
    <li>
      <Link
        to={`/lists/${id}`}
        viewTransition
        onMouseEnter={() => {
          utils.lists.getById.prefetch({ id })
        }}
        className="block px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          {imageUrl !== undefined ? (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="size-12 rounded overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={imageAlt || name}
                    className="w-full h-full object-cover"
                    style={{ viewTransitionName: `list-image-${id}` }}
                  />
                ) : (
                  <List className="text-muted-foreground" size={20} />
                )}
              </div>
              <h3
                className="flex-1 heading-3 truncate"
                style={{ viewTransitionName: `list-title-${id}` }}
              >
                {name}
              </h3>
            </div>
          ) : (
            <h3
              className="flex-1 heading-3 text-accent-foreground truncate"
              style={{ viewTransitionName: `list-title-${id}` }}
            >
              {name}
            </h3>
          )}
          <span
            className={`text-xs ${imageUrl !== undefined ? 'text-muted-foreground' : 'text-accent-foreground'}`}
          >
            {count}
          </span>
        </div>
      </Link>
    </li>
  )
}
