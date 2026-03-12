import { STEP_UP_ACTIONS } from '@hominem/auth/step-up-actions';
import { useCallback, useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL;

interface PasskeyAuthResult {
  success: true;
}

interface PasskeyAuthError {
  error: string;
  message: string;
}

// Raw JSON shape returned by the API (challenge and ids are base64url strings)
interface RawPublicKeyCredentialRequestOptions {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{ type: string; id: string; transports?: string[] }>;
  userVerification?: UserVerificationRequirement;
}

interface RawPublicKeyCredentialCreationOptions {
  challenge: string;
  timeout?: number;
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: Array<{ type: string; alg: number }>;
  excludeCredentials?: Array<{ type: string; id: string; transports?: string[] }>;
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
}

function decodeBase64Url(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes.buffer;
}

function normalizeRequestOptions(
  raw: RawPublicKeyCredentialRequestOptions,
): PublicKeyCredentialRequestOptions {
  const result: PublicKeyCredentialRequestOptions = {
    challenge: decodeBase64Url(raw.challenge),
  };
  if (raw.timeout !== undefined) result.timeout = raw.timeout;
  if (raw.rpId !== undefined) result.rpId = raw.rpId;
  if (raw.userVerification !== undefined) result.userVerification = raw.userVerification;
  if (raw.allowCredentials !== undefined) {
    result.allowCredentials = raw.allowCredentials.map((c) => {
      const desc: PublicKeyCredentialDescriptor = {
        type: c.type as PublicKeyCredentialType,
        id: decodeBase64Url(c.id),
      };
      if (c.transports) desc.transports = c.transports as AuthenticatorTransport[];
      return desc;
    });
  }
  return result;
}

function normalizeCreationOptions(
  raw: RawPublicKeyCredentialCreationOptions,
): PublicKeyCredentialCreationOptions {
  const result: PublicKeyCredentialCreationOptions = {
    challenge: decodeBase64Url(raw.challenge),
    rp: raw.rp,
    user: {
      id: decodeBase64Url(raw.user.id),
      name: raw.user.name,
      displayName: raw.user.displayName,
    },
    pubKeyCredParams: raw.pubKeyCredParams.map((p) => ({
      type: p.type as PublicKeyCredentialType,
      alg: p.alg,
    })),
  };
  if (raw.timeout !== undefined) result.timeout = raw.timeout;
  if (raw.attestation !== undefined) result.attestation = raw.attestation;
  if (raw.authenticatorSelection !== undefined)
    result.authenticatorSelection = raw.authenticatorSelection;
  if (raw.excludeCredentials !== undefined) {
    result.excludeCredentials = raw.excludeCredentials.map((c) => {
      const desc: PublicKeyCredentialDescriptor = {
        type: c.type as PublicKeyCredentialType,
        id: decodeBase64Url(c.id),
      };
      if (c.transports) desc.transports = c.transports as AuthenticatorTransport[];
      return desc;
    });
  }
  return result;
}

export interface UsePasskeyAuthOptions {
  /**
   * Where to redirect after successful sign-in.
   */
  redirectTo?: string;
}

export function usePasskeyAuth(options: UsePasskeyAuthOptions = {}) {
  const { redirectTo } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(typeof navigator !== 'undefined' && !!navigator.credentials);
  }, []);

  const authenticate = useCallback(async (): Promise<PasskeyAuthResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get WebAuthn options from server
      const optionsResponse = await fetch(`${API_URL}/api/auth/passkey/auth/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!optionsResponse.ok) {
        const err = (await optionsResponse.json()) as PasskeyAuthError;
        throw new Error(err.message || 'Failed to get passkey options');
      }

      const rawPayload = (await optionsResponse.json()) as
        | { options?: RawPublicKeyCredentialRequestOptions }
        | RawPublicKeyCredentialRequestOptions;
      // The API may return options directly or wrapped in an `options` key
      const rawOptions =
        (rawPayload as { options?: RawPublicKeyCredentialRequestOptions }).options ??
        (rawPayload as RawPublicKeyCredentialRequestOptions);
      // Normalize base64url strings to ArrayBuffers for the WebAuthn API
      const publicKeyOptions = normalizeRequestOptions(rawOptions);

      // Step 2: Prompt for passkey
      const credential = (await navigator.credentials.get({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('No passkey credential provided');
      }

      const assertionResponse = credential.response as AuthenticatorAssertionResponse;

      // Step 3: Verify the passkey and establish the Better Auth session cookie.
      const verifyResponse = await fetch(`${API_URL}/api/auth/passkey/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          response: {
            id: credential.id,
            rawId: arrayBufferToBase64Url(credential.rawId),
            type: credential.type,
            response: {
              clientDataJSON: arrayBufferToBase64Url(assertionResponse.clientDataJSON),
              authenticatorData: arrayBufferToBase64Url(assertionResponse.authenticatorData),
              signature: arrayBufferToBase64Url(assertionResponse.signature),
              userHandle: assertionResponse.userHandle
                ? arrayBufferToBase64Url(assertionResponse.userHandle)
                : null,
            },
          },
        }),
      });

      if (!verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        const err = verifyData as PasskeyAuthError;
        throw new Error(err.message || 'Passkey verification failed');
      }

      window.location.href = redirectTo || '/finance';

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Passkey authentication failed';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [redirectTo]);

  const requireStepUp = useCallback(async (action: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const optionsResponse = await fetch(`${API_URL}/api/auth/passkey/auth/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!optionsResponse.ok) {
        const err = (await optionsResponse.json()) as PasskeyAuthError;
        throw new Error(err.message || 'Failed to get passkey options');
      }

      const rawPayload = (await optionsResponse.json()) as
        | { options?: RawPublicKeyCredentialRequestOptions }
        | RawPublicKeyCredentialRequestOptions;
      const rawOptions =
        (rawPayload as { options?: RawPublicKeyCredentialRequestOptions }).options ??
        (rawPayload as RawPublicKeyCredentialRequestOptions);
      const publicKeyOptions = normalizeRequestOptions(rawOptions);

      const credential = (await navigator.credentials.get({
        publicKey: publicKeyOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('No passkey credential provided');
      }

      const assertionResponse = credential.response as AuthenticatorAssertionResponse;
      const verifyResponse = await fetch(`${API_URL}/api/auth/passkey/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          response: {
            id: credential.id,
            rawId: arrayBufferToBase64Url(credential.rawId),
            type: credential.type,
            response: {
              clientDataJSON: arrayBufferToBase64Url(assertionResponse.clientDataJSON),
              authenticatorData: arrayBufferToBase64Url(assertionResponse.authenticatorData),
              signature: arrayBufferToBase64Url(assertionResponse.signature),
              userHandle: assertionResponse.userHandle
                ? arrayBufferToBase64Url(assertionResponse.userHandle)
                : null,
            },
          },
        }),
      });

      if (!verifyResponse.ok) {
        const err = (await verifyResponse.json()) as PasskeyAuthError;
        throw new Error(err.message || 'Passkey step-up verification failed');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Passkey step-up verification failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register a new passkey for the currently authenticated user.
   * Requires the user to already have a valid app session (access token cookie).
   */
  const register = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const stepUpSatisfied = await requireStepUp(STEP_UP_ACTIONS.PASSKEY_REGISTER);
      if (!stepUpSatisfied) {
        return false;
      }

      // Step 1: Get registration options from server
      const optionsResponse = await fetch(`${API_URL}/api/auth/passkey/register/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!optionsResponse.ok) {
        const err = (await optionsResponse.json()) as PasskeyAuthError;
        throw new Error(err.message || 'Failed to get passkey registration options');
      }

      const rawRegPayload = (await optionsResponse.json()) as
        | { options?: RawPublicKeyCredentialCreationOptions }
        | RawPublicKeyCredentialCreationOptions;
      // The API may return options directly or wrapped in an `options` key
      const rawRegOptions =
        (rawRegPayload as { options?: RawPublicKeyCredentialCreationOptions }).options ??
        (rawRegPayload as RawPublicKeyCredentialCreationOptions);
      // Normalize base64url strings to ArrayBuffers for the WebAuthn API
      const registrationOptions = normalizeCreationOptions(rawRegOptions);

      // Step 2: Create new credential via browser
      const credential = (await navigator.credentials.create({
        publicKey: registrationOptions,
      })) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('No passkey credential created');
      }

      const attestationResponse = credential.response as AuthenticatorAttestationResponse;

      // Step 3: Send attestation to server for verification + storage
      const verifyResponse = await fetch(`${API_URL}/api/auth/passkey/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          response: {
            id: credential.id,
            rawId: arrayBufferToBase64Url(credential.rawId),
            type: credential.type,
            response: {
              clientDataJSON: arrayBufferToBase64Url(attestationResponse.clientDataJSON),
              attestationObject: arrayBufferToBase64Url(attestationResponse.attestationObject),
              transports: attestationResponse.getTransports
                ? attestationResponse.getTransports()
                : [],
            },
          },
        }),
      });

      if (!verifyResponse.ok) {
        const err = (await verifyResponse.json()) as PasskeyAuthError;
        throw new Error(err.message || 'Passkey registration verification failed');
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Passkey registration failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [requireStepUp]);

  const deletePasskey = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const stepUpSatisfied = await requireStepUp(STEP_UP_ACTIONS.PASSKEY_DELETE);
        if (!stepUpSatisfied) {
          return false;
        }

        const response = await fetch(`${API_URL}/api/auth/passkey/delete`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          const err = (await response.json()) as PasskeyAuthError;
          throw new Error(err.message || 'Failed to delete passkey');
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete passkey';
        setError(message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [requireStepUp],
  );

  return {
    authenticate,
    deletePasskey,
    register,
    requireStepUp,
    isLoading,
    error,
    isSupported,
  };
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < (bytes.byteLength ?? bytes.length); i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
