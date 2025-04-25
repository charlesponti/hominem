import type { ReactNode } from 'react'
import { useCallback, type MouseEvent } from 'react'
import { Link, type LinkProps } from 'react-router'
import { useRouteLoadingStore } from '../store/route-loading-store'

interface RouteLinkProps extends LinkProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function RouteLink({ children, className, onClick, ...props }: RouteLinkProps) {
  const setIsRouteLoading = useRouteLoadingStore((state) => state.setIsRouteLoading)

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      setIsRouteLoading(true)
      if (onClick) onClick(e)
    },
    [setIsRouteLoading, onClick]
  )

  return (
    <Link {...props} className={className} style={props.style} onClick={handleClick}>
      {children}
    </Link>
  )
}
