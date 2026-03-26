export function resolveRootIndexRedirect(isSignedIn: boolean) {
  return isSignedIn ? '/(protected)/(tabs)/start' : '/(auth)';
}
