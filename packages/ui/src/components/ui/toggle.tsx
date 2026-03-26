import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../../lib/utils';

const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-150 data-[state=on]:bg-[var(--color-accent-subtle)] data-[state=on]:text-[var(--color-accent)] data-[state=on]:border-[var(--color-accent)]/20 focus-visible:outline-none focus-visible:ring-[var(--color-accent)]/25 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-40 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-emphasis-faint)]',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'bg-transparent border border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]',
      },
      size: {
        default: 'h-10 px-3',
        sm: 'h-9 px-2.5',
        lg: 'h-11 px-5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size, className }))}
    {...props}
  />
));

Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
