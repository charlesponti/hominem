import * as React from 'react';

import { cn } from '../../lib/utils';
import type { InlineAlign, InlineBaseProps, InlineJustify } from './inline.types';
import type { GapToken } from './stack.types';

const gapMap: Record<GapToken, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

interface InlineProps extends React.ComponentProps<'div'>, InlineBaseProps {
  as?: React.ElementType;
}

const alignMap: Record<InlineAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};

const justifyMap: Record<InlineJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

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
  );
}

export { Inline, type InlineProps };
