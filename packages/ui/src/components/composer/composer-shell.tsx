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
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(env(safe-area-inset-bottom),10px)]">
      <div className="page-width-lg w-full" style={{ marginInline: 'auto' }}>
        <div
          className={[
            'pointer-events-auto flex w-full flex-col gap-1.5 rounded-2xl',
            // Surface
            'border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)]/95 backdrop-blur-xl',
            // Shadow — lifts away from the page
            'shadow-[0_-4px_32px_rgba(28,25,23,0.05),0_2px_12px_rgba(28,25,23,0.03)]',
            // Layout
            'px-3.5 py-3',
            // Focus-within: ambient accent glow — the composer "wakes up"
            'transition-shadow duration-300',
            'focus-within:shadow-[0_-4px_32px_rgba(212,165,116,0.08),0_0_0_1px_rgba(212,165,116,0.15),0_2px_12px_rgba(28,25,23,0.03)]',
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
