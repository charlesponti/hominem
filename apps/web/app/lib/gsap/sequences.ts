import gsap from 'gsap';

export const GSAP_DURATION_ENTER = 0.15;
export const GSAP_DURATION_EXIT = 0.12;
export const GSAP_DURATION_STANDARD = 0.12;

export const GSAP_EASE_ENTER = 'power2.out';
export const GSAP_EASE_EXIT = 'power2.in';
export const GSAP_EASE_STANDARD = 'power2.inOut';

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function playFocusExpand(el: HTMLElement, onComplete?: () => void) {
  if (reducedMotion()) {
    gsap.set(el, { opacity: 1, y: 0 });
    onComplete?.();
    return;
  }
  const vars: gsap.TweenVars = {
    opacity: 1,
    y: 0,
    duration: GSAP_DURATION_ENTER,
    ease: GSAP_EASE_ENTER,
  };
  if (onComplete) vars.onComplete = onComplete;
  gsap.fromTo(el, { opacity: 0, y: 12 }, vars);
}

export function playFocusCollapse(el: HTMLElement, onComplete?: () => void) {
  if (reducedMotion()) {
    gsap.set(el, { opacity: 0, y: 8 });
    onComplete?.();
    return;
  }
  const vars: gsap.TweenVars = {
    opacity: 0,
    y: 8,
    duration: GSAP_DURATION_EXIT,
    ease: GSAP_EASE_EXIT,
  };
  if (onComplete) vars.onComplete = onComplete;
  gsap.to(el, vars);
}

export function playContextSwitch(els: HTMLElement | HTMLElement[]) {
  if (reducedMotion()) {
    gsap.set(els, { opacity: 1 });
    return;
  }
  gsap.fromTo(
    els,
    { opacity: 0 },
    {
      opacity: 1,
      duration: GSAP_DURATION_STANDARD,
      ease: GSAP_EASE_STANDARD,
      stagger: 0.04,
    },
  );
}

export function playSubmitPulse(btnEl: HTMLElement, inputEl: HTMLElement, onComplete?: () => void) {
  if (reducedMotion()) {
    gsap.set(inputEl, { opacity: 0 });
    gsap.set(inputEl, { opacity: 1, delay: 0.01 });
    onComplete?.();
    return;
  }
  const tlVars: gsap.TimelineVars = {};
  if (onComplete) tlVars.onComplete = onComplete;
  const tl = gsap.timeline(tlVars);
  tl.to(btnEl, { scale: 1.12, duration: 0.06, ease: 'power1.in' })
    .to(btnEl, { scale: 1, duration: 0.06, ease: 'power1.out' })
    .to(inputEl, { opacity: 0, y: -8, duration: 0.1, ease: 'power1.in' }, '<')
    .set(inputEl, { opacity: 1, y: 0 });
}

export function playEnterRow(el: HTMLElement, delay = 0) {
  if (reducedMotion()) {
    gsap.set(el, { opacity: 1, y: 0 });
    return;
  }
  gsap.fromTo(
    el,
    { opacity: 0, y: 6 },
    {
      opacity: 1,
      y: 0,
      duration: GSAP_DURATION_ENTER,
      ease: GSAP_EASE_ENTER,
      delay,
    },
  );
}

export function playExitRow(el: HTMLElement, onComplete?: () => void) {
  if (reducedMotion()) {
    gsap.set(el, { opacity: 0 });
    onComplete?.();
    return;
  }
  const vars: gsap.TweenVars = {
    opacity: 0,
    y: -4,
    duration: GSAP_DURATION_EXIT,
    ease: GSAP_EASE_EXIT,
  };
  if (onComplete) vars.onComplete = onComplete;
  gsap.to(el, vars);
}

export function playShimmer(el: HTMLElement): gsap.core.Tween {
  return gsap.to(el, {
    opacity: 0.4,
    duration: 0.7,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1,
  });
}
