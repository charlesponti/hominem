import { getCookie } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

const BETTER_AUTH_COOKIE_KEY = 'hominem_cookie';
const MOBILE_SESSION_COOKIE_KEY = 'hominem_mobile_session_cookie_v1';

function toCookieHeader(setCookieValues: string[]) {
  const cookieParts: string[] = [];

  for (const value of setCookieValues) {
    const firstSegment = value.split(';')[0]?.trim();
    if (firstSegment) {
      cookieParts.push(firstSegment);
    }
  }

  return cookieParts.length > 0 ? cookieParts.join('; ') : null;
}

function getFallbackSetCookieHeader(headers: Headers) {
  const single = headers.get('set-cookie');
  if (!single) {
    return [];
  }

  return single
    .split(/,(?=[^;]+=[^;]+)/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export async function getPersistedSessionCookieHeader() {
  const storedHeader = await SecureStore.getItemAsync(MOBILE_SESSION_COOKIE_KEY);
  if (storedHeader) {
    return storedHeader;
  }

  const betterAuthCookie = await SecureStore.getItemAsync(BETTER_AUTH_COOKIE_KEY);
  if (!betterAuthCookie) {
    return null;
  }

  return getCookie(betterAuthCookie);
}

export async function persistSessionCookieHeader(cookieHeader: string) {
  await SecureStore.setItemAsync(MOBILE_SESSION_COOKIE_KEY, cookieHeader);
}

export async function persistSessionCookieFromHeaders(headers: Headers) {
  const normalizedValues = getFallbackSetCookieHeader(headers);
  const cookieHeader = toCookieHeader(normalizedValues);

  if (!cookieHeader) {
    return null;
  }

  await persistSessionCookieHeader(cookieHeader);
  return cookieHeader;
}

export async function clearPersistedSessionCookies() {
  await Promise.all([
    SecureStore.deleteItemAsync(MOBILE_SESSION_COOKIE_KEY),
    SecureStore.deleteItemAsync(BETTER_AUTH_COOKIE_KEY),
  ]);
}
