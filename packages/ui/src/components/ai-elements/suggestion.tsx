import { type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface SuggestionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Suggestions({ children, className, ...props }: SuggestionsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} {...props}>
      {children}
    </div>
  );
}

interface SuggestionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  suggestion: string;
  onSuggestionClick?: (suggestion: string) => void;
}

export function Suggestion({ suggestion, onSuggestionClick, className, ...props }: SuggestionProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('text-muted-foreground hover:text-foreground', className)}
      onClick={() => onSuggestionClick?.(suggestion)}
      {...props}
    >
      {suggestion}
    </Button>
  );
}
