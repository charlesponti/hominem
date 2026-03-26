import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-sm px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-[var(--color-accent)]/25 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] [a&]:hover:border-[var(--color-border-default)]',
        secondary:
          'bg-[var(--color-emphasis-faint)] text-[var(--color-text-secondary)] [a&]:hover:text-[var(--color-text-primary)]',
        destructive:
          'bg-[var(--color-destructive-subtle)] text-[var(--color-destructive)] border border-transparent [a&]:hover:bg-[var(--color-destructive)]/15',
        outline:
          'border border-[var(--color-border-default)] text-[var(--color-text-primary)] bg-transparent [a&]:hover:bg-[var(--color-emphasis-faint)]',
        ghost:
          'text-[var(--color-text-secondary)] [a&]:hover:text-[var(--color-text-primary)] [a&]:hover:bg-[var(--color-emphasis-faint)]',
        accent:
          'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-transparent font-semibold',
        link: 'text-[var(--color-accent)] underline-offset-4 [a&]:hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
