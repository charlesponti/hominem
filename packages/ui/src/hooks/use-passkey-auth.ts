import { useCallback, useState } from 'react';

const API_URL = import.meta.env.VITE_PUBLIC_API_URL;

interface PasskeyAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name?: string;
  };
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
   * After successful sign-in, POST the accessToken to this app-local route
   * so the server can set an HttpOnly cookie before redirecting.
   * Defaults to '/auth/passkey/callback'.
   */
  callbackRoute?: string;
  /**
   * Where to redirect after successful sign-in.
   * Forwarded to the callback route as `next`.
   */
  redirectTo?: string;
}

export function usePasskeyAuth(options: UsePasskeyAuthOptions = {}) {
  const { callbackRoute = '/auth/passkey/callback', redirectTo } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Step 3: Send assertion to server — now returns canonical token contract
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

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        const err = verifyData as PasskeyAuthError;
        throw new Error(err.message || 'Passkey verification failed');
      }

      const result = verifyData as PasskeyAuthResult;

      if (!result.accessToken) {
        throw new Error('Server did not return an access token after passkey sign-in');
      }

      // Step 4: Store access token via server-side callback route (sets HttpOnly cookie)
      // Use fetch with redirect:follow so the browser applies Set-Cookie from the 302 response,
      // then navigate to the destination.
      const callbackBody: Record<string, string> = { accessToken: result.accessToken };
      if (redirectTo) callbackBody['next'] = redirectTo;

      const callbackResponse = await fetch(callbackRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(callbackBody),
        redirect: 'follow',
      });

      // Navigate to where the callback redirected us (or the default destination)
      const finalUrl = callbackResponse.url || redirectTo || '/finance';
      window.location.href = finalUrl;

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Passkey authentication failed';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [callbackRoute, redirectTo]);

  /**
   * Register a new passkey for the currently authenticated user.
   * Requires the user to already have a valid app session (access token cookie).
   */
  const register = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
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
  }, []);

  return {
    authenticate,
    register,
    isLoading,
    error,
    isSupported: typeof navigator !== 'undefined' && !!navigator.credentials,
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
