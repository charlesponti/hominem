/**
 * Extract Set-Cookie headers from a Headers object.
 *
 * The fetch API's Headers.getSetCookie() method exists at runtime but isn't
 * in all TypeScript definitions yet. This helper works around that type gap.
 *
 * @param headers - The Headers object to extract cookies from
 * @returns Array of Set-Cookie header values, or empty array if none
 */
export function getSetCookieHeaders(headers: Headers): string[] {
  const getSetCookie = (
    headers as Headers & {
      getSetCookie?: () => string[];
    }
  ).getSetCookie;
  return typeof getSetCookie === 'function' ? getSetCookie.call(headers) : [];
}
