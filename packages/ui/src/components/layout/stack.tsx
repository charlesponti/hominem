import * as React from 'react'
import { cn } from '../../lib/utils'

type GapToken = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const gapMap: Record<GapToken, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
}

interface StackProps extends React.ComponentProps<'div'> {
  /** Vertical gap between children using spacing tokens */
  gap?: GapToken
  /** Render as a different element */
  as?: React.ElementType
}

/**
 * Stack — vertical flex container with token-based gap.
 * Replaces ad hoc `flex flex-col gap-*` patterns in feature code.
 */
function Stack({ gap = 'md', as: Comp = 'div', className, ...props }: StackProps) {
  return (
    <Comp
      className={cn('flex flex-col', gapMap[gap], className)}
      {...props}
    />
  )
}

export { Stack, type StackProps, type GapToken }
