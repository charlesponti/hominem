import { HOME_ROUTE } from '~/services/navigation/routes';

interface ResolveAuthRedirectInput {
  isPending: boolean;
  isSignedIn: boolean;
  isSigningOut: boolean;
  segments: string[];
}

type AuthRedirectTarget = '/(auth)' | typeof HOME_ROUTE;

export function resolveAuthRedirect(input: ResolveAuthRedirectInput): AuthRedirectTarget | null {
  if (input.isPending || input.isSigningOut) {
    return null;
  }

  const inProtectedGroup = input.segments[0] === '(protected)';
  const inAuthGroup = input.segments[0] === '(auth)';

  if (!input.isSignedIn && inProtectedGroup) {
    return '/(auth)';
  }

  if (input.isSignedIn && inAuthGroup) {
    return HOME_ROUTE;
  }

  return null;
}
