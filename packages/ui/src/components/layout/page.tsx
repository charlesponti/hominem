import * as React from 'react';

import { cn } from '../../lib/utils';
import type { PageMaxWidth } from './page.types';

const maxWidthMap: Record<PageMaxWidth, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
};

interface PageProps extends React.ComponentProps<'main'> {
  /**
   * Maximum content width.
   * - `lg` (default) matches the shared max-w-5xl content constraint.
   * - `sm` for focused single-column content (forms, detail views).
   */
  maxWidth?: PageMaxWidth;
  /** Whether to add standard horizontal padding. Defaults to true. */
  padded?: boolean;
}

/**
 * Page — top-level route wrapper for web.
 * Handles max-width constraint and horizontal padding consistently.
 * Replaces one-off `<main className="max-w-* mx-auto px-*">` patterns.
 *
 * @example
 * <Page>
 *   <Heading>My Notes</Heading>
 *   ...
 * </Page>
 *
 * <Page maxWidth="sm">
 *   <SignInForm />
 * </Page>
 */
function Page({ maxWidth = 'lg', padded = true, className, ...props }: PageProps) {
  return (
    <main
      className={cn('w-full mx-auto', maxWidthMap[maxWidth], padded && 'px-4 sm:px-6', className)}
      {...props}
    />
  );
}

interface ContainerProps extends React.ComponentProps<'div'> {
  maxWidth?: PageMaxWidth;
  padded?: boolean;
}

/**
 * Container — generic max-width content wrapper.
 * Use `Page` for top-level route shells.
 * Use `Container` for nested content regions that need their own constraint.
 */
function Container({ maxWidth = 'lg', padded = true, className, ...props }: ContainerProps) {
  return (
    <div
      className={cn('w-full mx-auto', maxWidthMap[maxWidth], padded && 'px-4 sm:px-6', className)}
      {...props}
    />
  );
}

export { Page, Container, type PageProps, type ContainerProps, type PageMaxWidth };
