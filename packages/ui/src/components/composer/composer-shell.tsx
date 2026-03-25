/**
 * ComposerShell
 *
 * Fixed-position card at the bottom of the viewport.
 * Pure layout — no refs, no animations, no state.
 */

import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

export function ComposerShell({
  isDraftMode,
  children,
}: {
  isDraftMode: boolean;
  children: ReactNode;
}) {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-2 pb-[max(env(safe-area-inset-bottom),10px)]">
      <div className="mx-auto w-full max-w-195">
        <div
          className={cn(
            'pointer-events-auto flex w-full flex-col gap-3 rounded-3xl border border-border bg-background px-4 pb-3 pt-4 [box-shadow:0_-8px_24px_rgba(15,23,42,0.06)]',
            isDraftMode && 'min-h-40',
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
