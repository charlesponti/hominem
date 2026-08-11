import { Input } from '@ponti-studios/ui/forms';
import { Label } from '@ponti-studios/ui/primitives';
import { Mail } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '~/lib/utils';

interface EmailFieldProps extends Omit<ComponentProps<typeof Input>, 'type'> {
  label?: string;
}

/** A single-row email input: icon | field. */
export function EmailField({
  id = 'email',
  label = 'Email',
  className,
  ...inputProps
}: EmailFieldProps) {
  return (
    <div className="space-y-1">
      {label ? (
        <Label htmlFor={id} className="subheading-4 text-muted-foreground">
          {label}
        </Label>
      ) : null}
      <div className="flex items-center">
        <span className="inline-flex h-9 shrink-0 items-center rounded-l-md border border-r-0 bg-surface-base px-3 text-muted-foreground">
          <Mail className="size-4" aria-hidden />
        </span>
        <Input id={id} type="email" className={cn('rounded-l-none', className)} {...inputProps} />
      </div>
    </div>
  );
}
