import { Button } from '@ponti-studios/ui/primitives';
import { PlusIcon } from 'lucide-react';
import type { ComponentProps, ReactElement } from 'react';

type AddButtonProps = Omit<
  ComponentProps<typeof Button>,
  'aria-label' | 'children' | 'size' | 'variant'
> & {
  label: string;
  children?: ReactElement;
};

export function AddButton({ label, children, asChild, ...props }: AddButtonProps) {
  return (
    <Button
      {...props}
      asChild={asChild}
      variant="default"
      size="icon"
      aria-label={label}
      title={label}
    >
      {asChild ? children : <PlusIcon aria-hidden />}
    </Button>
  );
}
