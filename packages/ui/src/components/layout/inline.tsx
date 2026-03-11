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

interface InlineProps extends React.ComponentProps<'div'> {
  /** Horizontal gap between children using spacing tokens */
  gap?: GapToken
  /** Whether children wrap to the next line */
  wrap?: boolean
  /** Cross-axis alignment */
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'
  /** Main-axis justification */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
  /** Render as a different element */
  as?: React.ElementType
}

const alignMap: Record<NonNullable<InlineProps['align']>, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
}

const justifyMap: Record<NonNullable<InlineProps['justify']>, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
}

/**
 * Inline — horizontal flex container with token-based gap.
 * Replaces ad hoc `flex items-center gap-*` patterns in feature code.
 */
function Inline({
  gap = 'sm',
  wrap = false,
  align = 'center',
  justify = 'start',
  as: Comp = 'div',
  className,
  ...props
}: InlineProps) {
  return (
    <Comp
      className={cn(
        'flex',
        alignMap[align],
        justifyMap[justify],
        gapMap[gap],
        wrap && 'flex-wrap',
        className,
      )}
      {...props}
    />
  )
}

export { Inline, type InlineProps }
