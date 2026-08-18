export function getFloatingDockInset({
  keyboardHeight,
  safeAreaBottom,
}: {
  keyboardHeight: number;
  safeAreaBottom: number;
}) {
  return Math.max(0, keyboardHeight - safeAreaBottom);
}
