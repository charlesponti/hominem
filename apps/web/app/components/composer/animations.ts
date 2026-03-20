/**
 * Composer animation helpers
 *
 * Generic sequences (entry, submit pulse, context switch, collapse) delegate
 * to the canonical implementations in @hominem/ui/lib/gsap.
 *
 * Mobile-specific swipe constants and playSwipeSnap are kept local because
 * they are gesture-layer concerns with no shared-library equivalent.
 *
 * Phase 4 — Animation migration.
 */

import gsap from 'gsap';

// ─── Re-export canonical sequences ────────────────────────────────────────────

export {
  playFocusExpand as playEntry,
  playSubmitPulse,
  playContextSwitch,
  playFocusCollapse,
} from '@hominem/ui/lib/gsap';

// ─── Mobile-specific swipe constants (kept local) ─────────────────────────────

export const PILL_HEIGHT = 56;
export const MOBILE_EXPANDED_HEIGHT_VH = 0.7; // 70dvh fraction

// ─── playSwipeSnap (kept local — gesture-layer only) ─────────────────────────

export function playSwipeSnap(el: HTMLDivElement, targetHeight: number, onComplete?: () => void) {
  const vars: gsap.TweenVars = {
    height: targetHeight,
    duration: 0.3,
    ease: 'elastic.out(1, 0.5)',
  };
  if (onComplete) vars.onComplete = onComplete;
  gsap.to(el, vars);
}
