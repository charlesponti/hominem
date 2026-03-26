import * as React from 'react';

import { cn } from '../../lib/utils';
import type { PageMaxWidth } from './page.types';

const widthMap: Record<PageMaxWidth, string> = {
  sm: 'page-width-sm',
  md: 'page-width-md',
  lg: 'page-width-lg',
  xl: 'page-width-xl',
  full: 'page-width-full',
};

interface CenterProps extends React.ComponentProps<'div'> {
  /**
   * Constrain the centered content to a max width.
   * Omit for full-width centering (just margin-inline: auto).
   */
  maxWidth?: PageMaxWidth;
  /**
   * Element type. Defaults to `div`.
   * Use `as="section"` or `as="article"` for semantic HTML.
   */
  as?: React.ElementType;
}

/**
 * Center — layout primitive that horizontally centers its content.
 *
 * This is the canonical PDL (Parent-Driven Layout) centering primitive.
 * Instead of adding `mx-auto` or `margin-inline: auto` directly to leaf
 * components, wrap them in `<Center>`. The parent is responsible for
 * positioning; children only care about their internal styles.
 *
 * Uses `margin-inline: auto` (logical property — RTL-safe).
 *
 * @example
 * // Center a form within the page:
 * <Center maxWidth="sm">
 *   <SignInForm />
 * </Center>
 *
 * // Center without width constraint:
 * <Center>
 *   <SomeComponent />
 * </Center>
 */
function Center({ as: Tag = 'div', maxWidth, className, style, ...props }: CenterProps) {
  return (
    <Tag
      className={cn('w-full', maxWidth && widthMap[maxWidth], className)}
      style={{ marginInline: 'auto', ...style }}
      {...props}
    />
  );
}

export { Center, type CenterProps };
