import * as React from 'react';

import { cn } from '../../lib/utils';
import type { TextVariant } from './text.types';

type TextElement = 'p' | 'span' | 'div' | 'li' | 'label' | 'strong' | 'em' | 'small';

interface TextProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Visual variant from the VOID body typography scale.
   * Defaults to body-2.
   */
  variant?: TextVariant;
  /**
   * HTML element to render.
   * Defaults to `p`.
   */
  as?: TextElement;
  /** Muted/secondary color treatment */
  muted?: boolean;
}

/**
 * Text — body copy primitive mapped to VOID typography scale.
 * Replaces direct `<p>` / `<span>` usage for body text in feature code.
 *
 * @example
 * <Text>Body copy</Text>
 * <Text variant="body-4" muted>Helper hint</Text>
 * <Text as="span" variant="body-3">Inline text</Text>
 */
function Text({
  variant = 'body-2',
  as: Comp = 'p',
  muted = false,
  className,
  ...props
}: TextProps) {
  return <Comp className={cn(variant, muted && 'text-text-tertiary', className)} {...props} />;
}

export { Text, type TextProps, type TextVariant };
