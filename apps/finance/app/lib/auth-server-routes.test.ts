import { describe, expect, it } from 'vitest';

import { copySetCookieHeaders } from './auth-server-routes';

describe('copySetCookieHeaders', () => {
  it('preserves every auth cookie in an upstream response', () => {
    const source = new Headers();
    source.append('set-cookie', 'better-auth.session_token=token; Path=/; HttpOnly');
    source.append('set-cookie', 'better-auth.session_data=data; Path=/; HttpOnly');

    expect(copySetCookieHeaders(source).getSetCookie()).toEqual([
      'better-auth.session_token=token; Path=/; HttpOnly',
      'better-auth.session_data=data; Path=/; HttpOnly',
    ]);
  });
});
