import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import z from 'zod'
import { trpc } from '~/lib/trpc/client'
import { env } from '~/lib/env'
import { cn } from '~/lib/utils'
import UserAvatar from '../user-avatar'

const buildImageUrl = (src?: string | null, width = 400, height = 300) => {
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
  addedBy,
}: PlaceRowProps) {
  const resolvedImage = buildImageUrl(photoUrl) ?? buildImageUrl(imageUrl) ?? null
  const utils = trpc.useUtils()

  const handlePrefetch = () => {
    const id = href.split('/').pop()
    if (!id) return

    if (z.uuid().safeParse(id).success) {
      utils.places.getDetailsById.prefetch({ id })
    } else {
      utils.places.getDetailsByGoogleId.prefetch({ googleMapsId: id })
    }
  }

  return (
    <li
      className={cn('flex items-center gap-3 px-2 py-1 group hover:bg-gray-50 transition-colors', {
        'bg-indigo-50': isSelected,
      })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-selected={isSelected}
    >
      <Link
        to={href}
        viewTransition
        onMouseEnter={handlePrefetch}
        className="flex-1 min-w-0 focus:outline-none"
      >
        <div className="flex items-center gap-4">
          <div className="size-8 rounded-sm overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
            {resolvedImage ? (
              <img
                src={resolvedImage}
                alt={name}
                style={{ viewTransitionName: `place-row-image-${href.split('/').pop()}` }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <Star className="text-indigo-400" size={28} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="flex-1 text-sm text-accent-foreground truncate">{name}</p>
              {meta ?? null}
            </div>
            <div className="flex items-center gap-2">
              {subtitle ? (
                <p className="text-xs text-muted-foreground/60 truncate">{subtitle}</p>
              ) : null}
              {addedBy && (
                <div className="flex items-center gap-1.5">
                  <UserAvatar
                    name={addedBy.name ?? undefined}
                    email={addedBy.email}
                    image={addedBy.image}
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>

      {accessory ? <div className="ml-2 flex items-center">{accessory}</div> : null}
    </li>
  )
}
