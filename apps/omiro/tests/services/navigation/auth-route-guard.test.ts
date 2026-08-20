import { describe, expect, it } from 'vitest';

import { resolveAuthRedirect } from '~/services/navigation/auth-route-guard';

describe('resolveAuthRedirect', () => {
  it('redirects signed-out users away from protected routes', () => {
    expect(
      resolveAuthRedirect({
        isPending: false,
        isSignedIn: false,
        isSigningOut: false,
        segments: ['(protected)', 'settings'],
      }),
    ).toBe('/(auth)');
  });

  it('redirects signed-in users away from auth routes', () => {
    expect(
      resolveAuthRedirect({
        isPending: false,
        isSignedIn: true,
        isSigningOut: false,
        segments: ['(auth)'],
      }),
    ).toBe('/(protected)');
  });

  it('does not redirect while booting or signing out', () => {
    expect(
      resolveAuthRedirect({
        isPending: true,
        isSignedIn: false,
        isSigningOut: false,
        segments: ['(auth)'],
      }),
    ).toBeNull();

    expect(
      resolveAuthRedirect({
        isPending: false,
        isSignedIn: false,
        isSigningOut: true,
        segments: ['(protected)'],
      }),
    ).toBeNull();
  });
});
