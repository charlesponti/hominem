import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '../../lib/utils';
import type { ButtonBaseProps } from './button.types';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[var(--color-accent)]/25 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] shadow-[var(--shadow-low)] hover:bg-[var(--color-bg-elevated)] hover:border-[var(--color-border-strong)] active:scale-[0.98]',
        primary:
          'bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[0_1px_3px_rgba(212,165,116,0.25)] hover:bg-[var(--color-accent-hover)] active:scale-[0.98]',
        destructive:
          'bg-[var(--color-destructive)] text-white shadow-[0_1px_3px_rgba(239,68,68,0.25)] hover:bg-[var(--color-destructive)]/90 active:scale-[0.98] focus-visible:ring-destructive/25',
        outline:
          'border border-[var(--color-border-default)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] hover:border-[var(--color-border-strong)] active:scale-[0.98]',
        secondary:
          'bg-[var(--color-bg-inset)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] hover:border-[var(--color-border-default)]',
        ghost:
          'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-emphasis-faint)]',
        link: 'text-[var(--color-accent)] underline-offset-4 hover:underline decoration-[var(--color-accent)]/40 hover:decoration-[var(--color-accent)]',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        md: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: "h-6 gap-1 rounded-sm px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-lg px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 rounded-sm [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'md',
  asChild = false,
  isLoading = false,
  title,
  children,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  } & ButtonBaseProps) {
  const Comp = asChild ? Slot.Root : 'button';
  const content = children ?? title;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={isLoading || props.disabled}
      className={cn(buttonVariants({ variant, size, className }))}
      type={asChild ? undefined : type}
      {...props}
    >
      {content}
    </Comp>
  );
}

export { Button, buttonVariants };
