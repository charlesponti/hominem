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
  href?: string
  photoUrl?: string | null
  imageUrl?: string | null
  meta?: ReactNode
  subtitle?: ReactNode
  accessory?: ReactNode
  isSelected?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  className?: string
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
}: PlaceRowProps) {
  const resolvedImage = buildImageUrl(photoUrl) ?? buildImageUrl(imageUrl) ?? null

  const baseClasses = 'flex items-center gap-3 p-3 group hover:bg-gray-50 transition-colors'
  const selectedClasses = isSelected ? ' bg-indigo-50' : ''
  const rootClasses = `${baseClasses}${selectedClasses}${className ? ` ${className}` : ''}`

  const ContentWrapper = href ? Link : 'div'
  const contentProps = href
    ? { to: href, className: 'flex-1 min-w-0 focus:outline-none' }
    : { className: 'flex-1 min-w-0' }

  return (
    <div
      className={rootClasses}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-selected={isSelected}
    >
      <ContentWrapper {...contentProps}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
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
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-gray-900 truncate text-base">{name}</h3>
              {meta ? (
                <div className="flex items-center text-sm text-indigo-600">{meta}</div>
              ) : null}
            </div>
            {subtitle ? <div className="text-xs text-gray-500 truncate">{subtitle}</div> : null}
          </div>
        </div>
      </ContentWrapper>

      {accessory ? <div className="ml-2 flex items-center">{accessory}</div> : null}
    </div>
  )
}
