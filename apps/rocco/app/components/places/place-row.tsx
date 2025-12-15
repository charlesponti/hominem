import { Avatar, AvatarFallback, AvatarImage } from '@hominem/ui/components/ui/avatar'
import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { env } from '~/lib/env'

const buildImageUrl = (src?: string | null, width = 400, height = 300): string | null => {
  if (!src) return null

  if (src.includes('places/') && src.includes('/photos/')) {
    return `https://places.googleapis.com/v1/${src}/media?key=${env.VITE_GOOGLE_API_KEY}&maxWidthPx=${width}&maxHeightPx=${height}`
  }

  if (src.includes('googleusercontent')) {
    return `${src}=w${width}-h${height}-c`
  }

  return src
}

type PlaceRowProps = {
  name: string
  href: string
  photoUrl?: string | null
  imageUrl?: string | null
  meta?: ReactNode
  subtitle?: ReactNode
  accessory?: ReactNode
  isSelected?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  className?: string
  addedBy?: {
    id: string
    name: string | null
    email: string
    image: string | null
  } | null
}

export default function PlaceRow({
  name,
  href,
  photoUrl,
  imageUrl,
  meta,
  subtitle,
  accessory,
  isSelected = false,
  onMouseEnter,
  onMouseLeave,
  className = '',
  addedBy,
}: PlaceRowProps) {
  const resolvedImage = buildImageUrl(photoUrl) ?? buildImageUrl(imageUrl) ?? null

  const baseClasses = 'flex items-center gap-3 p-3 group hover:bg-gray-50 transition-colors'
  const selectedClasses = isSelected ? ' bg-indigo-50' : ''
  const rootClasses = `${baseClasses}${selectedClasses}${className ? ` ${className}` : ''}`

  console.log('avatar', addedBy?.image)
  return (
    <div
      className={rootClasses}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-selected={isSelected}
    >
      <Link to={href} className="flex-1 min-w-0 focus:outline-none">
        <div className="flex items-center gap-4">
          <div className="size-16 rounded overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
            {resolvedImage ? (
              <img
                src={resolvedImage}
                alt={name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <Star className="text-indigo-400" size={28} />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex-1 heading-3 text-accent-foreground truncate">{name}</h3>
              {meta ?? null}
            </div>
            <div className="flex items-center gap-2">
              {subtitle ? <div className="text-xs text-gray-500 truncate">{subtitle}</div> : null}
              {addedBy && (
                <div className="flex items-center gap-1.5">
                  <Avatar
                    className="h-5 w-5 border border-border"
                    title={addedBy.name || addedBy.email}
                  >
                    <AvatarImage
                      src={addedBy.image || undefined}
                      alt={addedBy.name || addedBy.email}
                    />
                    <AvatarFallback className="text-xs">
                      {(addedBy.name || addedBy.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>

      {accessory ? <div className="ml-2 flex items-center">{accessory}</div> : null}
    </div>
  )
}
