export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hasTouch = () => {
    const navigatorWithMs = navigator as Navigator & { msMaxTouchPoints?: number };

    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigatorWithMs.msMaxTouchPoints ?? 0) > 0
    );
  };

  const isMobileViewport = () =>
    window.matchMedia('(max-width: 768px) and (any-hover: none)').matches;

  return hasTouch() || isMobileViewport();
}
