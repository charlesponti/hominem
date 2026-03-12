import * as React from 'react';

import { cn } from '../../lib/utils';
import type { StackBaseProps, GapToken } from './stack.types';

const gapMap: Record<GapToken, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

interface StackProps extends React.ComponentProps<'div'>, StackBaseProps {
  as?: React.ElementType;
}

function interleaveChildren(children: React.ReactNode, divider: React.ReactNode) {
  const items = React.Children.toArray(children);

  return items.flatMap((child, index) => {
    if (index === items.length - 1) {
      return [child];
    }

    const key = React.isValidElement(child) && child.key !== null ? String(child.key) : `${index}`;

    return [child, <React.Fragment key={`divider-${key}`}>{divider}</React.Fragment>];
  });
}

/**
 * Stack — vertical flex container with token-based gap.
 * Replaces ad hoc `flex flex-col gap-*` patterns in feature code.
 */
function Stack({
  gap = 'md',
  as: Comp = 'div',
  className,
  children,
  divider,
  ...props
}: StackProps) {
  return (
    <Comp className={cn('flex flex-col', gapMap[gap], className)} {...props}>
      {divider ? interleaveChildren(children, divider) : children}
    </Comp>
  );
}

export { Stack, type StackProps, type GapToken };
