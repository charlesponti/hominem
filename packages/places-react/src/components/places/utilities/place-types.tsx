import type { HTMLAttributes } from 'react'

import { cn } from '@hominem/ui/lib/utils'

const EXCLUDED_TYPES = ['establishment', 'food', 'point_of_interest', 'political']

export interface PlaceTypeProps extends HTMLAttributes<HTMLSpanElement> {}

const PlaceType = ({ children, className, ...props }: PlaceTypeProps) => {
  return (
    <span
      data-testid="place-type"
      className={cn(
        'inline-flex items-center gap-1.5',
        'px-3 py-1.5',
        'text-xs font-semibold tracking-wide',
        'bg-muted',
        'border border-border',
        'text-foreground',
        className,
      )}
      {...props}
    >
      <span className="capitalize">{children}</span>
    </span>
  )
}

export interface PlaceTypesProps {
  limit?: number
  types: string[]
}

const PlaceTypes = ({ limit, types }: PlaceTypesProps) => {
  const filterExcludedTypes = (type: string) => !EXCLUDED_TYPES.includes(type)

  const isPointOfInterest =
    types.length === 2 && types.includes('establishment') && types.includes('point_of_interest')

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {isPointOfInterest ? (
        <PlaceType>Point of Interest</PlaceType>
      ) : (
        types
          .slice(0, limit)
          .filter(filterExcludedTypes)
          .filter((type, index, arr) => {
            void index
            if (type === 'store' && arr.length > 1) {
              return false
            }

            if (type.includes('_restaurant') && arr.includes('restaurant')) {
              return false
            }

            return true
          })
          .map((type) => (
            <PlaceType key={type}>{type.replace(/_store/gi, '').replace(/_/gi, ' ')}</PlaceType>
          ))
      )}
    </div>
  )
}

export { PlaceTypes, PlaceType }
