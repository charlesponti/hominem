import { cn } from '../../lib/utils'
import type * as React from 'react'

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
        'bg-input border-border rounded-md border',
        // Typography
        'text-base md:text-sm',
        // Visual effects
        'shadow-xs transition-[color,box-shadow] outline-none',
        // File input styles
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
        // Placeholder styles
        'placeholder:text-muted-foreground',
        // Selection styles
        'selection:bg-primary selection:text-primary-foreground',
        // Disabled states
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        // Focus states
        'focus-visible:border focus-visible:border-indigo-600',
        // Invalid states
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  )
}

export { Input }
