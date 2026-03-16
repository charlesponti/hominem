import type { HominemSession, HominemUser } from '@hominem/auth/types';
import { z } from 'zod';

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  image: z.string().optional(),
  isAdmin: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const sessionResponseSchema = z.object({
  isAuthenticated: z.boolean(),
  user: userSchema.nullable(),
  accessToken: z.string().nullable().optional(),
  expiresIn: z.number().nullable().optional(),
});

const passkeyOptionsSchema = z.object({
  challenge: z.string(),
  timeout: z.number().optional(),
  rpId: z.string().optional(),
  allowCredentials: z
    .array(
      z.object({
        type: z.literal('public-key'),
        id: z.string(),
        transports: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  userVerification: z.enum(['required', 'preferred', 'discouraged']).optional(),
});

const passkeyAuthOptionsResponseSchema = z.object({
  options: passkeyOptionsSchema.optional(),
  challenge: passkeyOptionsSchema.optional(),
});

interface SessionResult {
  session: HominemSession | null;
  user: HominemUser | null;
}

interface PasskeyAllowCredential {
  id: string;
  transports?: string[];
  type: 'public-key';
}

interface SerializedAuthenticatorAssertionResponse {
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
  userHandle?: string | null;
}

interface SerializedPublicKeyCredential {
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
  id: string;
  rawId: string;
  response: SerializedAuthenticatorAssertionResponse;
  type: PublicKeyCredentialType;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function createSession(accessToken: string, expiresIn: number): HominemSession {
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresIn,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeOtpCode(otp: string) {
  return otp.replace(/\D/g, '');
}

function normalizeUser(user: z.infer<typeof userSchema>): HominemUser {
  return {
    id: user.id,
    email: user.email,
    ...(user.name ? { name: user.name } : {}),
    ...(user.image ? { image: user.image } : {}),
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function clearStoredSession() {
  return undefined;
}

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function normalizePasskeyRequestOptions(
  options: z.infer<typeof passkeyOptionsSchema>,
): PublicKeyCredentialRequestOptions {
  return {
    challenge: fromBase64Url(options.challenge),
    ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
    ...(options.rpId ? { rpId: options.rpId } : {}),
    ...(options.allowCredentials
      ? {
          allowCredentials: options.allowCredentials.map((credential) => {
            const passkeyCredential = credential as PasskeyAllowCredential;

            return {
              id: fromBase64Url(passkeyCredential.id),
              type: 'public-key' as const,
              ...(passkeyCredential.transports
                ? {
                    transports: passkeyCredential.transports as AuthenticatorTransport[],
                  }
                : {}),
            };
          }),
        }
      : {}),
    ...(options.userVerification ? { userVerification: options.userVerification } : {}),
  };
}

function serializeAssertion(credential: PublicKeyCredential): SerializedPublicKeyCredential {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    clientExtensionResults: credential.getClientExtensionResults(),
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    response: {
      authenticatorData: toBase64Url(response.authenticatorData),
      clientDataJSON: toBase64Url(response.clientDataJSON),
      signature: toBase64Url(response.signature),
      ...(response.userHandle
        ? { userHandle: toBase64Url(response.userHandle) }
        : { userHandle: null }),
    },
    type: 'public-key',
  };
}

async function readJson<T>(response: Response, schema: z.ZodSchema<T>) {
  const payload = await response.json();
  return schema.parse(payload);
}

async function readAuthenticatedSession(apiBaseUrl: string): Promise<SessionResult> {
  const response = await fetch(`${apiBaseUrl}/api/auth/session`, {
    credentials: 'include',
    method: 'GET',
  });

  if (response.status === 401) {
    return { session: null, user: null };
  }

  if (!response.ok) {
    throw new Error('Failed to restore desktop auth session.');
  }

  const payload = await readJson(response, sessionResponseSchema);
  if (!payload.isAuthenticated || !payload.user) {
    return { session: null, user: null };
  }

  return {
    session:
      payload.accessToken && payload.expiresIn
        ? createSession(payload.accessToken, payload.expiresIn)
        : null,
    user: normalizeUser(payload.user),
  };
}

export async function bootstrapSession(apiBaseUrl: string): Promise<SessionResult> {
  return readAuthenticatedSession(apiBaseUrl);
}

export async function requestEmailOtp(apiBaseUrl: string, email: string) {
  const response = await fetch(`${apiBaseUrl}/api/auth/email-otp/send`, {
    body: JSON.stringify({ email: normalizeAuthEmail(email), type: 'sign-in' }),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to send verification code.');
  }
}

export async function verifyEmailOtp(
  apiBaseUrl: string,
  email: string,
  otp: string,
): Promise<SessionResult> {
  const response = await fetch(`${apiBaseUrl}/api/auth/email-otp/verify`, {
    body: JSON.stringify({ email: normalizeAuthEmail(email), otp: normalizeOtpCode(otp) }),
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Verification failed. Please check your code and try again.');
  }

  return readAuthenticatedSession(apiBaseUrl);
}

export function isPasskeySupported() {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';
}

export async function signInWithPasskey(apiBaseUrl: string): Promise<SessionResult> {
  if (!isPasskeySupported()) {
    throw new Error('Passkeys are not available in this environment.');
  }

  const optionsResponse = await fetch(`${apiBaseUrl}/api/auth/passkey/auth/options`, {
    credentials: 'include',
    method: 'POST',
  });

  if (!optionsResponse.ok) {
    throw new Error('Failed to request passkey authentication.');
  }

  const optionsPayload = await readJson(optionsResponse, passkeyAuthOptionsResponseSchema);
  const options = optionsPayload.options ?? optionsPayload.challenge;
  if (!options) {
    throw new Error('Invalid passkey options response.');
  }

  const credential = (await navigator.credentials.get({
    publicKey: normalizePasskeyRequestOptions(options),
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Passkey authentication was cancelled.');
  }

  const verifyResponse = await fetch(`${apiBaseUrl}/api/auth/passkey/auth/verify`, {
    body: JSON.stringify({
      response: serializeAssertion(credential),
    }),
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  if (!verifyResponse.ok) {
    throw new Error('Passkey sign-in failed.');
  }

  return readAuthenticatedSession(apiBaseUrl);
}

export async function signOut(apiBaseUrl: string, session: HominemSession | null) {
  void session;

  const response = await fetch(`${apiBaseUrl}/api/auth/logout`, {
    credentials: 'include',
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to sign out. Please try again.');
  }

  clearStoredSession();
}

export function toUserFacingError(error: unknown, fallback: string) {
  return new Error(getErrorMessage(error, fallback));
}
