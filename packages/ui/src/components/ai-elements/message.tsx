import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { chatTokens } from '../../tokens/chat';

interface MessageProps extends HTMLAttributes<HTMLDivElement> {
  from: 'user' | 'assistant' | 'system';
}

export const Message = forwardRef<HTMLDivElement, MessageProps>(function Message(
  { from, className, children, ...props },
  ref,
) {
  const isUser = from === 'user';
  const isSystem = from === 'system';

  return (
    <div
      ref={ref}
      data-role={from}
      className={cn(
        'flex w-full py-2',
        isSystem ? 'justify-center' : isUser ? 'justify-end' : 'justify-start',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

interface MessageContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
  width?: 'transcript' | 'bubble' | 'full';
}

export function MessageContent({
  children,
  className,
  align = 'start',
  width = 'transcript',
  style,
  ...props
}: MessageContentProps) {
  const maxWidth =
    width === 'bubble'
      ? chatTokens.userBubbleMaxWidth
      : width === 'transcript'
        ? chatTokens.transcriptMaxWidth
        : undefined;

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col',
        align === 'end' && 'items-end text-right',
        align === 'center' && 'items-center text-center',
        width !== 'full' && 'w-full',
        className,
      )}
      style={{ ...(style as CSSProperties), ...(maxWidth ? { maxWidth } : {}) }}
      {...props}
    >
      {children}
    </div>
  );
}

interface MessageSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'assistant' | 'user' | 'system' | 'debug';
}

export function MessageSurface({
  tone = 'assistant',
  className,
  children,
  ...props
}: MessageSurfaceProps) {
  return (
    <div
      className={cn(
        'min-w-0',
        tone === 'user' &&
          'rounded-md bg-emphasis-highest px-4 py-3 text-primary-foreground shadow-low',
        tone === 'system' &&
          'rounded-md border border-subtle bg-surface px-3 py-2 text-text-secondary',
        tone === 'debug' &&
          'rounded-md border border-subtle bg-surface px-3 py-2 text-text-secondary',
        className,
      )}
      {...props}
    >
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
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-medium',
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
    <div className={cn('body-1 whitespace-pre-wrap text-foreground', className)} {...props}>
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
    <div
      className={cn('mt-2 flex flex-wrap gap-1 body-4 text-text-tertiary', className)}
      {...props}
    >
      {children}
    </div>
  );
}
