import type * as React from 'react';

import * as LabelPrimitive from '@radix-ui/react-label';

import { cn } from '../../lib/utils';

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-xs leading-none font-light select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]: peer-disabled:cursor-not-allowed peer-disabled:',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
