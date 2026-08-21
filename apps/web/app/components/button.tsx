import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '../lib/utils';
import type { ButtonBaseProps } from './button.types';

const buttonVariants = cva(
  "h-10 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-100 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-secondary disabled:text-secondary-foreground',
        primary:
          'bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-secondary disabled:text-secondary-foreground',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20',
        icon: 'rounded-full border border-accent',
        outline: 'border bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        xs: 'px-2',
        sm: 'px-3',
        md: 'px-3.5',
        lg: 'px-4',
        icon: 'size-10',
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
  fullWidth = false,
  title,
  children,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  } & ButtonBaseProps) {
  const Comp = asChild ? Slot : 'button';
  const content = children ?? title;

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={isLoading || props.disabled}
      className={cn(buttonVariants({ variant, size, className }), fullWidth && 'w-full')}
      type={asChild ? undefined : type}
      {...props}
    >
      {content}
    </Comp>
  );
}

export { Button, buttonVariants };
