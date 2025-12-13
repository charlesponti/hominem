import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '~/lib/utils'

type ListSurfaceProps = HTMLAttributes<HTMLUListElement>

const ListSurface = forwardRef<HTMLUListElement, ListSurfaceProps>(
  ({ className, ...props }, ref) => {
    return (
      <ul
        ref={ref}
        className={cn(
          'list-none bg-white/50 divide-y divide-border rounded-md border overflow-hidden',
          className
        )}
        {...props}
      />
    )
  }
)

ListSurface.displayName = 'ListSurface'

export default ListSurface
