import * as React from 'react';

import { cn } from '../../lib/utils';
import type { HeadingLevel, HeadingVariant } from './heading.types';

/** Default variant for each semantic level */
const levelVariantMap: Record<HeadingLevel, HeadingVariant> = {
  1: 'heading-1',
  2: 'heading-2',
  3: 'heading-3',
  4: 'heading-4',
};

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /**
   * Semantic heading level — controls the rendered HTML element.
   * Defaults to 2.
   */
  level?: HeadingLevel;
  /**
   * Visual variant from the VOID typography scale.
   * Defaults to the variant matching the semantic level.
   */
  variant?: HeadingVariant;
  /** Render as a different element while keeping styles (e.g., `as="p"`) */
  as?: React.ElementType;
}

/**
 * Heading — semantic heading primitive mapped to VOID typography scale.
 * Replaces raw `<h1>`–`<h4>` tags in feature code.
 *
 * @example
 * <Heading level={1}>Page Title</Heading>
 * <Heading level={2} variant="display-1">Hero Headline</Heading>
 */
function Heading({ level = 2, variant, as, className, ...props }: HeadingProps) {
  const appliedVariant = variant ?? levelVariantMap[level];
  const Comp = as ?? (`h${level}` as React.ElementType);
  return <Comp className={cn(appliedVariant, className)} {...props} />;
}

export { Heading, type HeadingProps, type HeadingLevel, type HeadingVariant };
