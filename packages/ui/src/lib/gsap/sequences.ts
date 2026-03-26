import gsap from 'gsap';

// ─── Timing constants ─────────────────────────────────────────────────────────
// Spring-inspired durations. Enters are longer (settle), exits are snappy.

export const GSAP_DURATION_ENTER = 0.25;
export const GSAP_DURATION_EXIT = 0.12;
export const GSAP_DURATION_STANDARD = 0.18;
export const GSAP_DURATION_SPRING = 0.4;

// Spring-like easing — overshoot on enter, clean on exit
export const GSAP_EASE_ENTER = 'power3.out';
export const GSAP_EASE_EXIT = 'power2.in';
export const GSAP_EASE_STANDARD = 'power2.inOut';
export const GSAP_EASE_SPRING = 'back.out(1.2)';
export const GSAP_EASE_BOUNCE = 'elastic.out(1, 0.5)';

// ─── Reduced-motion guard ────────────────────────────────────────────────────

export function reducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ─── focusExpand ─────────────────────────────────────────────────────────────
// Component expanding into view — spring-like overshoot for joy.

export function playFocusExpand(el: HTMLElement, onComplete?: () => void) {
  if (reducedMotion()) {
    gsap.set(el, { opacity: 1, y: 0, scale: 1 });
    onComplete?.();
    return;
  }
  gsap.fromTo(
    el,
    { opacity: 0, y: 16, scale: 0.97 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: GSAP_DURATION_SPRING,
      ease: GSAP_EASE_SPRING,
      ...(onComplete ? { onComplete } : {}),
    },
  );
}

// ─── focusCollapse ────────────────────────────────────────────────────────────

export function playFocusCollapse(el: HTMLElement, onComplete?: () => void) {
  if (reducedMotion()) {
    gsap.set(el, { opacity: 0, y: 8 });
    onComplete?.();
    return;
  }
  gsap.to(el, {
    opacity: 0,
    y: 8,
    scale: 0.98,
    duration: GSAP_DURATION_EXIT,
    ease: GSAP_EASE_EXIT,
    ...(onComplete ? { onComplete } : {}),
  });
}

// ─── contextSwitch ───────────────────────────────────────────────────────────
// Cascading fade for mode transitions — each element enters in sequence.

export function playContextSwitch(els: HTMLElement | HTMLElement[]) {
  if (reducedMotion()) {
    gsap.set(els, { opacity: 1 });
    return;
  }
  gsap.fromTo(
    els,
    { opacity: 0, y: 4 },
    {
      opacity: 1,
      y: 0,
      duration: GSAP_DURATION_STANDARD,
      ease: GSAP_EASE_ENTER,
      stagger: 0.05,
    },
  );
}

// ─── submitPulse ─────────────────────────────────────────────────────────────
// Satisfying press → release on submit — haptic-like visual feedback.

export function playSubmitPulse(btnEl: HTMLElement, inputEl: HTMLElement, onComplete?: () => void) {
  if (reducedMotion()) {
    gsap.set(inputEl, { opacity: 0 });
    gsap.set(inputEl, { opacity: 1, delay: 0.01 });
    onComplete?.();
    return;
  }
  const tl = gsap.timeline(onComplete ? { onComplete } : {});
  tl.to(btnEl, { scale: 0.92, duration: 0.06, ease: 'power2.in' })
    .to(btnEl, { scale: 1.08, duration: 0.1, ease: GSAP_EASE_SPRING })
    .to(btnEl, { scale: 1, duration: 0.15, ease: 'power2.out' })
    .to(inputEl, { opacity: 0, y: -10, duration: 0.12, ease: 'power2.in' }, '<0.04')
    .set(inputEl, { opacity: 1, y: 0 });
}

// ─── enterRow ────────────────────────────────────────────────────────────────
// Spring-in for new list rows — slight overshoot creates liveliness.

export function playEnterRow(el: HTMLElement, delay = 0) {
  if (reducedMotion()) {
    gsap.set(el, { opacity: 1, y: 0, scale: 1 });
    return;
  }
  gsap.fromTo(
    el,
    { opacity: 0, y: 10, scale: 0.98 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: GSAP_DURATION_ENTER,
      ease: GSAP_EASE_ENTER,
      delay,
    },
  );
}

// ─── exitRow ─────────────────────────────────────────────────────────────────

export function playExitRow(el: HTMLElement, onComplete?: () => void) {
  if (reducedMotion()) {
    gsap.set(el, { opacity: 0 });
    onComplete?.();
    return;
  }
  gsap.to(el, {
    opacity: 0,
    y: -6,
    scale: 0.98,
    duration: GSAP_DURATION_EXIT,
    ease: GSAP_EASE_EXIT,
    ...(onComplete ? { onComplete } : {}),
  });
}

// ─── enterStagger ────────────────────────────────────────────────────────────
// Cascading entrance for a group of elements — each one arrives in sequence.
// Use for focus-view rows, search results, settings panels.

export function playEnterStagger(els: HTMLElement[], baseDelay = 0) {
  if (reducedMotion()) {
    gsap.set(els, { opacity: 1, y: 0, scale: 1 });
    return;
  }
  gsap.fromTo(
    els,
    { opacity: 0, y: 12, scale: 0.97 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: GSAP_DURATION_ENTER,
      ease: GSAP_EASE_ENTER,
      stagger: 0.04,
      delay: baseDelay,
    },
  );
}

// ─── successPop ──────────────────────────────────────────────────────────────
// Celebratory scale pop for successful actions (save, complete, copy).

export function playSuccessPop(el: HTMLElement) {
  if (reducedMotion()) return;
  gsap.fromTo(
    el,
    { scale: 1 },
    {
      scale: 1.08,
      duration: 0.12,
      ease: 'power2.out',
      yoyo: true,
      repeat: 1,
    },
  );
}

// ─── hoverLift ──────────────────────────────────────────────────────────────
// Subtle lift on hover — card, row, interactive element.

export function playHoverLift(el: HTMLElement) {
  if (reducedMotion()) return;
  gsap.to(el, {
    y: -2,
    boxShadow: '0 8px 24px rgba(28, 25, 23, 0.08)',
    duration: 0.2,
    ease: 'power2.out',
  });
}

export function playHoverReset(el: HTMLElement) {
  if (reducedMotion()) return;
  gsap.to(el, {
    y: 0,
    boxShadow: '0 1px 3px rgba(28, 25, 23, 0.04), 0 1px 2px rgba(28, 25, 23, 0.02)',
    duration: 0.15,
    ease: 'power2.out',
  });
}

// ─── shimmer ─────────────────────────────────────────────────────────────────

export function playShimmer(el: HTMLElement): gsap.core.Tween {
  return gsap.to(el, {
    opacity: 0.4,
    duration: 0.8,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}

// ─── typewriterReveal ────────────────────────────────────────────────────────
// Progressive content reveal — for AI message streaming feel.

export function playTypewriterReveal(el: HTMLElement) {
  if (reducedMotion()) {
    gsap.set(el, { opacity: 1 });
    return;
  }
  gsap.fromTo(
    el,
    { opacity: 0, filter: 'blur(2px)' },
    {
      opacity: 1,
      filter: 'blur(0px)',
      duration: 0.3,
      ease: 'power2.out',
    },
  );
}
