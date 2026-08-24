import { X } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

export interface AnimatedPillProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  dismissLabel?: string;
  direction?: 'down' | 'up';
  isDismissible?: boolean;
  isOpen: boolean;
  onDismiss?: () => void;
  resetKey?: unknown;
}

export function AnimatedPill({
  children,
  className,
  dismissLabel = 'Dismiss',
  direction = 'down',
  isDismissible = false,
  isOpen,
  onDismiss,
  resetKey,
  ...props
}: AnimatedPillProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const hiddenTransform = direction === 'down' ? '-translate-y-full' : 'translate-y-full';
  const isVisible = isOpen && !isDismissed;

  useEffect(() => {
    setIsDismissed(false);
  }, [isOpen, resetKey]);

  function handleDismiss() {
    setIsDismissed(true);
    onDismiss?.();
  }

  return (
    <div
      aria-hidden={!isVisible}
      className={cn(
        'relative z-0 flex items-center justify-between gap-2 rounded-b-xl px-3 pt-3 text-xs transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
        isVisible
          ? 'min-h-8 translate-y-0 opacity-100'
          : `pointer-events-none h-0 min-h-0 overflow-hidden ${hiddenTransform} opacity-0`,
        className,
      )}
      {...props}
    >
      {children}
      {isDismissible ? (
        <Button
          aria-label={dismissLabel}
          className="size-6 shrink-0 rounded-full text-destructive"
          onClick={handleDismiss}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <X aria-hidden="true" size={14} />
        </Button>
      ) : null}
    </div>
  );
}
