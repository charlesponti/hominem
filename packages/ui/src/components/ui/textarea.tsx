import * as React from 'react';

import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full border border-border bg-input p-2 text-sm placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50',
          'invalid:border-red-500 text-destructive placeholder:text-destructive bg-destructive/5',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
