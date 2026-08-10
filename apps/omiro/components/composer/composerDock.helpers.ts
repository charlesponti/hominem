export function getFloatingDockInset({
  dockHeight,
  keyboardHeight,
  safeAreaBottom,
}: {
  dockHeight: number;
  keyboardHeight: number;
  safeAreaBottom: number;
}) {
  return dockHeight + Math.max(0, keyboardHeight - safeAreaBottom);
}
