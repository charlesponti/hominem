import type { HTMLAttributes } from 'react'

interface PlaceTypeProps extends HTMLAttributes<HTMLSpanElement> {
  emoji?: string
}

const PlaceType = ({ children, className, emoji }: PlaceTypeProps) => {
  return (
    <span
      data-testid="place-type"
      className={`rounded-full text-nowrap px-3 py-1.5 bg-linear-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-700 text-xs font-medium ${className}`}
    >
      {emoji && <span className="mr-1.5">{emoji}</span>}
      {children}
    </span>
  )
}

export default PlaceType
