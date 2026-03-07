import { KeyRound, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const DISMISSED_KEY = 'hominem_passkey_enrollment_dismissed';

interface PasskeyEnrollmentBannerProps {
  /**
   * Base URL for the API. Must include the API root (e.g. https://api.example.com).
   * If not provided, defaults to the VITE_PUBLIC_API_URL env var.
   */
  apiUrl?: string;
  /**
   * Called when the user clicks "Add passkey". Should open the passkey
   * registration flow (e.g. invoke addPasskey from useMobilePasskeyAuth or
   * the web passkey registration hook).
   */
  onEnroll: () => Promise<void>;
}

/**
 * Shows a dismissible banner prompting the user to add a passkey after sign-in.
 *
 * The banner is hidden:
 *  - If the user has already dismissed it (stored in localStorage).
 *  - If the user already has at least one passkey registered.
 *  - If the browser does not support WebAuthn.
 *
 * Place this in the authenticated app layout so it appears once after sign-in.
 */
export function PasskeyEnrollmentBanner({ apiUrl, onEnroll }: PasskeyEnrollmentBannerProps) {
  const [visible, setVisible] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.PublicKeyCredential) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const base =
      apiUrl ??
      (typeof import.meta !== 'undefined'
        ? (import.meta.env.VITE_PUBLIC_API_URL as string | undefined)
        : undefined) ??
      '';

    fetch(`${base}/api/auth/passkeys`, {
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
    })
      .then((res) => {
        if (!res.ok) return;
        return res.json() as Promise<unknown[]>;
      })
      .then((passkeys) => {
        if (Array.isArray(passkeys) && passkeys.length === 0) {
          setVisible(true);
        }
      })
      .catch(() => {
        // Network failure — silently skip, don't block the app
      });
  }, [apiUrl]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }, []);

  const handleEnroll = useCallback(async () => {
    setEnrolling(true);
    try {
      await onEnroll();
      dismiss();
    } catch {
      // Enrollment failed or was cancelled — don't dismiss
    } finally {
      setEnrolling(false);
    }
  }, [onEnroll, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="banner"
      className="flex items-center gap-3 border border-border bg-muted px-4 py-3 text-sm"
    >
      <KeyRound className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="grow text-muted-foreground">
        Sign in faster with a passkey — no password needed.
      </span>
      <button
        type="button"
        onClick={handleEnroll}
        disabled={enrolling}
        className="shrink-0 font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-50"
      >
        {enrolling ? 'Adding...' : 'Add passkey'}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss passkey prompt"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" aria-hidden />
      </button>
    </div>
  );
}
