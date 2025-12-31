import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '../lib/utils'
import { Loading } from './ui/loading'

type LoadingSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

type ListSurfaceProps = HTMLAttributes<HTMLUListElement> & {
  isLoading?: boolean
  loadingSize?: LoadingSize
}

const ListSurface = forwardRef<HTMLUListElement, ListSurfaceProps>(
  ({ className, isLoading, loadingSize = 'md', children, ...props }, ref) => {
    return (
      <ul
        ref={ref}
        className={cn(
          'list-none bg-white/50 divide-y divide-border rounded-md border overflow-hidden',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <li className="flex items-center justify-center py-8">
            <Loading size={loadingSize} />
          </li>
        ) : (
          children
        )}
      </ul>
    )
  }
)

ListSurface.displayName = 'ListSurface'

export { ListSurface }
