import type * as React from 'react';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
  "p-2 inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semilight disabled:pointer-events-none disabled: [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:border-destructive uppercase tracking-tight",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground void-invert',
        destructive: 'bg-destructive text-white void-invert',
        outline: 'border hover:bg-accent hover:text-accent-foreground void-invert',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary void-invert',
        ghost: 'hover:bg-accent hover:text-accent-foreground void-invert',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5 text-xs font-semilight',
        lg: 'h-10 px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
