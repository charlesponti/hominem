import type * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
  cn(
    'inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-tight',
    'focus:outline-hidden',
  ),
  {
    variants: {
      variant: {
        default: 'bg-primary hover:bg-emphasis-highest border-transparent text-primary-foreground',
        secondary: 'bg-secondary hover:bg-secondary border-transparent text-secondary-foreground',
        destructive:
          'bg-destructive hover:bg-destructive border-transparent text-destructive-foreground',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
