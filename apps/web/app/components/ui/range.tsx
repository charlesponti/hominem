import * as React from 'react';

import { cn } from '~/lib/utils';

type RangeProps = Omit<React.ComponentProps<'input'>, 'type'>;

function Range({ className, ...props }: RangeProps) {
  return (
    <input
      {...props}
      type="range"
      data-slot="range"
      className={cn('h-6 w-full cursor-pointer', className)}
    />
  );
}

export { Range };
