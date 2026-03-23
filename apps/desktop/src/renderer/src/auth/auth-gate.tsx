import { Button } from '@hominem/ui/button';
import { Input } from '@hominem/ui/input';
import { Label } from '@hominem/ui/label';
import { useMemo, useState } from 'react';

import { AppShell } from '../app-shell';
import { DESKTOP_BRAND } from '../brand';
import { useDesktopAuth } from './desktop-auth-provider';

function DesktopAuthLoading() {
  return (
    <main className="desktop-auth">
      <section className="desktop-auth__panel" aria-live="polite">
        <p className="desktop-auth__eyebrow">{DESKTOP_BRAND.displayName}</p>
        <h1 className="desktop-auth__title">Checking your session</h1>
        <p className="desktop-auth__body">Restoring the desktop auth state.</p>
      </section>
    </main>
  );
}

function DesktopAuthScreen() {
  const {
    clearError,
    email,
    isPasskeyAvailable,
    requestOtp,
    restartAuth,
    signInWithPasskey,
    state,
    updateEmail,
    verifyOtp,
  } = useDesktopAuth();
  const [otp, setOtp] = useState('');

  const isSendingOtp = state.status === 'requesting_otp';
  const isVerifyingOtp = state.status === 'verifying_otp';
  const isPasskeyLoading = state.status === 'authenticating_passkey';
  const isOtpStep = state.status === 'otp_requested' || isVerifyingOtp;
    const helperText = useMemo(() => {
    if (isOtpStep && email) {
      return `Enter the code sent to ${email}.`;
    }
    return `Use the same authentication backend and account you use across ${DESKTOP_BRAND.appName}.`;
  }, [email, isOtpStep]);

  return (
    <main className="desktop-auth">
      <section className="desktop-auth__panel">
        <p className="desktop-auth__eyebrow">{DESKTOP_BRAND.displayName}</p>
        <h1 className="desktop-auth__title">Sign in to continue</h1>
        <p className="desktop-auth__body">{helperText}</p>

        {state.error && (
          <div className="desktop-auth__error" role="alert">
            <p>{state.error.message}</p>
            <button className="desktop-auth__link" onClick={clearError} type="button">
              Dismiss
            </button>
          </div>
        )}

        {!isOtpStep ? (
          <form
            className="desktop-auth__form"
            onSubmit={(event) => {
              event.preventDefault();
              void requestOtp(email);
            }}
          >
            <div className="desktop-auth__field">
              <Label htmlFor="desktop-email">Email address</Label>
              <Input
                autoComplete="email"
                className="desktop-auth__input"
                disabled={isSendingOtp || isPasskeyLoading}
                id="desktop-email"
                name="email"
                onChange={(event) => updateEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>

            <div className="desktop-auth__actions">
              <Button disabled={!email || isSendingOtp || isPasskeyLoading} type="submit">
                {isSendingOtp ? 'Sending code...' : 'Continue with email'}
              </Button>
              {isPasskeyAvailable && (
                <Button
                  disabled={isSendingOtp || isPasskeyLoading}
                  onClick={() => void signInWithPasskey()}
                  type="button"
                  variant="outline"
                >
                  {isPasskeyLoading ? 'Signing in...' : 'Use a passkey'}
                </Button>
              )}
            </div>
          </form>
        ) : (
          <form
            className="desktop-auth__form"
            onSubmit={(event) => {
              event.preventDefault();
              void verifyOtp(otp);
            }}
          >
            <div className="desktop-auth__field">
              <Label htmlFor="desktop-otp">Verification code</Label>
              <Input
                autoComplete="one-time-code"
                className="desktop-auth__input desktop-auth__input--otp"
                disabled={isVerifyingOtp}
                id="desktop-otp"
                inputMode="numeric"
                name="otp"
                onChange={(event) => setOtp(event.target.value)}
                placeholder="123456"
                required
                type="text"
                value={otp}
              />
            </div>

            <div className="desktop-auth__actions">
              <Button disabled={otp.length < 4 || isVerifyingOtp} type="submit">
                {isVerifyingOtp ? 'Verifying...' : 'Verify code'}
              </Button>
              <Button
                disabled={isVerifyingOtp}
                onClick={() => {
                  setOtp('');
                  clearError();
                  restartAuth();
                }}
                type="button"
                variant="outline"
              >
                Use a different email
              </Button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

export function AuthGate() {
  const { state } = useDesktopAuth();

  if (state.status === 'booting' || state.status === 'refreshing_session') {
    return <DesktopAuthLoading />;
  }

  if (state.status === 'signed_in') {
    return <AppShell />;
  }

  return <DesktopAuthScreen />;
}
