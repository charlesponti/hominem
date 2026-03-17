import { List } from 'lucide-react'
import { Link } from 'react-router'

export interface ListRowProps {
  id: string
  name: string
  count: number
  imageUrl?: string | null
  imageAlt?: string
}

function buildImageUrl(imageUrl: string | null | undefined, width: number, height: number): string {
  if (!imageUrl) return ''
  const url = new URL(imageUrl)
  url.searchParams.set('w', String(width))
  url.searchParams.set('h', String(height))
  url.searchParams.set('fit', 'cover')
  return url.toString()
}

export function ListRow({ id, name, count, imageUrl, imageAlt }: ListRowProps) {
  const thumbnailUrl = buildImageUrl(imageUrl, 80, 80)

  return (
    <li className="flex items-center gap-3 p-2 group border-b border-border">
      <Link to={`/lists/${id}`} viewTransition className="flex-1 min-w-0 void-focus">
        <div className="flex items-center gap-4">
          {imageUrl !== undefined ? (
            <>
              <div className="size-8 overflow-hidden shrink-0 border border-border flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={imageAlt || name}
                    className="w-full h-full object-cover"
                    style={{ viewTransitionName: `list-image-${id}` }}
                  />
                ) : (
                  <List className="text-muted-foreground" size={28} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p
                    className="flex-1 text-sm text-accent-foreground truncate"
                    style={{ viewTransitionName: `list-title-${id}` }}
                  >
                    {name}
                  </p>
                  <span className="text-xs text-muted-foreground">{count}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p
                  className="flex-1 text-sm text-accent-foreground truncate"
                  style={{ viewTransitionName: `list-title-${id}` }}
                >
                  {name}
                </p>
                <span className="text-xs text-accent-foreground">{count}</span>
              </div>
            </div>
          )}
        </div>
      </Link>
    </li>
  )
}
