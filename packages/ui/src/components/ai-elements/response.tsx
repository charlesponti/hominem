import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

interface ResponseProps extends HTMLAttributes<HTMLDivElement> {
  children?: string;
}

export const Response = forwardRef<HTMLDivElement, ResponseProps>(function Response(
  { children, className, ...props },
  ref,
) {
  if (!children) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none',
        'prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-p:leading-relaxed',
        'prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-muted prose-pre:text-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});
