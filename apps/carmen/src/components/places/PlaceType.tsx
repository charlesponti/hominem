import type { HTMLAttributes } from 'react'

const PlaceType = ({ children, className }: HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      data-testid="place-type"
      className={`rounded text-nowrap px-3 py-1 border border-slate-200 text-slate-400 text-xs capitalize italic ${className}`}
    >
      {children}
    </span>
  )
}

export default PlaceType
