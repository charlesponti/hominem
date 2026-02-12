import type * as React from 'react';

import { cn } from '../../lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Layout & sizing
        'flex h-9 w-full min-w-0',
        // Spacing
        'px-3 py-1',
        // Border & background
        'bg-input border-border border',
        // Typography
        'text-base md:text-sm',
        // Visual effects
        'outline-none',
        // File input styles
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        // Placeholder styles
        'placeholder:text-muted-foreground',
        // Selection styles
        'selection:bg-primary selection:text-primary-foreground',
        // Disabled states
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:',
        // Focus states
        'focus-visible:border focus-visible:border-foreground',
        // Invalid states
        'aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
