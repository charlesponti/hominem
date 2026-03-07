import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/utils';

interface MessageProps extends HTMLAttributes<HTMLDivElement> {
  from: 'user' | 'assistant' | 'system';
}

export const Message = forwardRef<HTMLDivElement, MessageProps>(function Message(
  { from, className, children, ...props },
  ref,
) {
  const isUser = from === 'user';

  return (
    <div
      ref={ref}
      className={cn('flex w-full gap-4 p-4', isUser ? 'flex-row-reverse' : 'flex-row', className)}
      {...props}
    >
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
});

interface MessageContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function MessageContent({ children, className, ...props }: MessageContentProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      {children}
    </div>
  );
}

interface MessageAvatarProps {
  fallback: string;
  className?: string;
}

export function MessageAvatar({ fallback, className }: MessageAvatarProps) {
  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium',
        className,
      )}
    >
      {fallback}
    </div>
  );
}

interface MessageResponseProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function MessageResponse({ children, className, ...props }: MessageResponseProps) {
  return (
    <div className={cn('text-sm whitespace-pre-wrap', className)} {...props}>
      {children}
    </div>
  );
}

interface MessageActionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function MessageAction({ children, className, ...props }: MessageActionProps) {
  return (
    <div className={cn('flex items-center gap-1', className)} {...props}>
      {children}
    </div>
  );
}

interface MessageAnnotationsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function MessageAnnotations({ children, className, ...props }: MessageAnnotationsProps) {
  return (
    <div className={cn('flex flex-wrap gap-1 mt-2', className)} {...props}>
      {children}
    </div>
  );
}
