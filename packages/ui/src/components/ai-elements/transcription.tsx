'use client';

import { Mic, Speaker, User } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';

interface TranscriptionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Transcription({ children, className, ...props }: TranscriptionProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      {children}
    </div>
  );
}

interface TranscriptionSegmentProps extends HTMLAttributes<HTMLDivElement> {
  speaker?: 'user' | 'assistant';
  timestamp?: string;
  text: string;
}

export function TranscriptionSegment({
  speaker = 'user',
  timestamp,
  text,
  className,
  ...props
}: TranscriptionSegmentProps) {
  const isUser = speaker === 'user';

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg',
        isUser ? 'bg-primary/10' : 'bg-muted',
        className,
      )}
      {...props}
    >
      <div className="mt-0.5">
        {isUser ? <User className="size-4" /> : <Speaker className="size-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">{isUser ? 'You' : 'Assistant'}</span>
          {timestamp && <span className="text-xs text-muted-foreground">{timestamp}</span>}
        </div>
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}

interface TranscriptionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function TranscriptionHeader({
  title = 'Transcription',
  className,
  children,
  ...props
}: TranscriptionHeaderProps) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 border-b', className)} {...props}>
      <Mic className="size-4 text-muted-foreground" />
      <span className="text-sm font-medium">{title}</span>
      {children}
    </div>
  );
}

interface TranscriptionContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function TranscriptionContent({ children, className, ...props }: TranscriptionContentProps) {
  return (
    <div className={cn('p-3', className)} {...props}>
      {children}
    </div>
  );
}

interface TranscriptionLoadingProps extends HTMLAttributes<HTMLDivElement> {
  text?: string;
}

export function TranscriptionLoading({
  text = 'Listening...',
  className,
  ...props
}: TranscriptionLoadingProps) {
  return (
    <div className={cn('flex items-center gap-2 p-3 text-muted-foreground', className)} {...props}>
      <Mic className="size-4 animate-pulse" />
      <span className="text-sm">{text}</span>
    </div>
  );
}
