import * as React from 'react';

import { cn } from '../../lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] selection:bg-[var(--color-accent-subtle)] selection:text-[var(--color-text-primary)] border-[var(--color-border-default)] h-9 w-full min-w-0 rounded-md border bg-[var(--color-bg-inset)] px-3 py-1 text-base text-[var(--color-text-primary)] transition-[color,box-shadow,border-color,background-color] duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 md:text-sm',
        'focus-visible:border-[var(--color-border-strong)] focus-visible:bg-[var(--color-bg-elevated)] focus-visible:ring-[var(--color-accent)]/15 focus-visible:ring-[3px]',
        'aria-invalid:ring-[var(--color-destructive)]/15 aria-invalid:border-[var(--color-destructive)]',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
