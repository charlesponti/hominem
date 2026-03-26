/**
 * ComposerShell
 *
 * Fixed-position card at the bottom of the viewport.
 * Pure layout — no refs, no animations, no state.
 *
 * Design: frosted glass pill with ambient accent glow on focus-within.
 * Performance: will-change on transform, GPU-composited backdrop-filter.
 */

import type { ReactNode } from 'react';

export function ComposerShell({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-5 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="page-width-compose w-full" style={{ marginInline: 'auto' }}>
        <div
          className={[
            'pointer-events-auto flex w-full flex-col gap-2.5 composer-shell-surface',
            // Surface
            'border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)]/95 backdrop-blur-xl',
            // Focus-within: ambient accent glow — the composer "wakes up"
            'transition-shadow duration-300',
            'focus-within:composer-shell-focus',
            // GPU compositing hint
            'will-change-[transform,box-shadow]',
          ].join(' ')}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
