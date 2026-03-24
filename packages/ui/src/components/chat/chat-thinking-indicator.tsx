import { useEffect, useState } from 'react';

import { cn } from '../../lib/utils';

export function ChatThinkingIndicator() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhase((current) => (current + 1) % 3);
    }, 240);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className={cn('h-2 w-2 rounded-full bg-foreground/70 transition-opacity', {
            'opacity-100': phase === 0,
            'opacity-40': phase !== 0,
          })}
        />
        <span
          className={cn('h-2 w-2 rounded-full bg-foreground/70 transition-opacity', {
            'opacity-100': phase === 1,
            'opacity-40': phase !== 1,
          })}
        />
        <span
          className={cn('h-2 w-2 rounded-full bg-foreground/70 transition-opacity', {
            'opacity-100': phase === 2,
            'opacity-40': phase !== 2,
          })}
        />
        <span className="text-xs text-text-tertiary">Thinking...</span>
      </div>
    </div>
  );
}
