/**
 * ComposerShell
 *
 * Fixed-position card at the bottom of the viewport.
 * Pure layout — no refs, no animations, no state.
 */

import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

export function ComposerShell({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-2 pb-[max(env(safe-area-inset-bottom),8px)]">
      <div className="page-width-lg w-full" style={{ marginInline: 'auto' }}>
        <div
          className={cn(
            'pointer-events-auto flex w-full flex-col gap-1.5 rounded-3xl border border-border-default bg-base px-3 py-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
