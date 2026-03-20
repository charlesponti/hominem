import gsap from 'gsap';

export const PILL_HEIGHT = 56;
export const MOBILE_EXPANDED_HEIGHT_VH = 0.7; // 70dvh fraction

// ─── entry ───────────────────────────────────────────────────────────────────
export function playEntry(el: HTMLDivElement) {
  gsap.fromTo(el, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.28, ease: 'power3.out' });
}

// ─── submitPulse ─────────────────────────────────────────────────────────────
export function playSubmitPulse(
  btnEl: HTMLButtonElement,
  inputEl: HTMLTextAreaElement,
  onComplete?: () => void,
) {
  const tlVars: gsap.TimelineVars = {};
  if (onComplete) tlVars.onComplete = onComplete;
  const tl = gsap.timeline(tlVars);
  tl.to(btnEl, { scale: 1.12, duration: 0.06, ease: 'power1.in' })
    .to(btnEl, { scale: 1, duration: 0.06, ease: 'power1.out' })
    .to(inputEl, { opacity: 0, y: -8, duration: 0.1, ease: 'power1.in' }, '<')
    .set(inputEl, { opacity: 1, y: 0 });
}

// ─── contextSwitch ───────────────────────────────────────────────────────────
export function playContextSwitch(labelEls: HTMLElement[]) {
  gsap.fromTo(
    labelEls,
    { opacity: 0 },
    { opacity: 1, duration: 0.16, ease: 'power1.inOut', stagger: 0.04 },
  );
}

// ─── swipeSnap ───────────────────────────────────────────────────────────────
export function playSwipeSnap(el: HTMLDivElement, targetHeight: number, onComplete?: () => void) {
  const vars: gsap.TweenVars = {
    height: targetHeight,
    duration: 0.3,
    ease: 'elastic.out(1, 0.5)',
  };
  if (onComplete) vars.onComplete = onComplete;
  gsap.to(el, vars);
}
