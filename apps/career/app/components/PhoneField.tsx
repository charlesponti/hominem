import { Input } from '@ponti-studios/ui/forms';
import { Phone } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '~/lib/utils';

interface PhoneFieldProps extends Omit<ComponentProps<typeof Input>, 'type'> {
  label?: string;
}

export function PhoneField({
  id = 'phone',
  label = 'Phone',
  className,
  ...inputProps
}: PhoneFieldProps) {
  return (
    <div className="space-y-1">
      {label ? <label htmlFor={id}>{label}</label> : null}
      <div className="flex items-center">
        <span className="inline-flex h-9 shrink-0 items-center rounded-l-md border border-r-0 bg-surface-base px-3 text-muted-foreground">
          <Phone className="size-4" aria-hidden />
        </span>
        <Input id={id} type="tel" className={cn('rounded-l-none', className)} {...inputProps} />
      </div>
    </div>
  );
}
