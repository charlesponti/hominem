import { join } from 'node:path';

import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { etag } from 'hono/etag';

import { betterAuthServer } from '../../auth/better-auth';
import { env } from '../../env';
import {
  emailSchema,
  getFormValue,
  loginUrl,
  otpSchema,
  resolveConsentQuery,
  resolveResume,
} from './helpers';
import { AuthErrorPage, ConsentPage, LoginPage, LogoutPage } from './pages';

const logoPath = join(process.cwd(), 'public', 'logo.hominem.500x500.webp');
const cssPath = join(process.cwd(), 'public', 'login.css');
const jsPath = join(process.cwd(), 'public', 'login.js');

function serveAsset(path: string, contentType: string) {
  return serveStatic({
    path,
    onFound: (_path, c) => {
      c.header('cache-control', 'public, max-age=86400');
      c.header('content-type', contentType);
    },
  });
}

async function callBetterAuth(input: {
  body: Record<string, string | boolean>;
  path: string;
  request: Request;
}) {
  const headers = new Headers(input.request.headers);
  headers.set('content-type', 'application/json');
  if (!headers.has('origin')) headers.set('origin', env.API_URL);
  return betterAuthServer.handler(
    new Request(new URL(`/api/auth${input.path}`, env.API_URL), {
      method: 'POST',
      headers,
      body: JSON.stringify(input.body),
    }),
  );
}

function copySetCookieHeaders(headers: Headers) {
  const copied = new Headers(headers);
  const setCookies = headers.getSetCookie();
  if (setCookies.length > 0) {
    copied.delete('set-cookie');
    for (const setCookie of setCookies) copied.append('set-cookie', setCookie);
  }
  return copied;
}

export const loginRoutes = new Hono()
  .use('/login.css', etag(), serveAsset(cssPath, 'text/css; charset=UTF-8'))
  .use('/login.js', etag(), serveAsset(jsPath, 'text/javascript; charset=UTF-8'))
  .use('/logo.hominem.500x500.webp', etag(), serveAsset(logoPath, 'image/webp'))
  .get('/login', async (c) => {
    const url = new URL(c.req.url);
    const resumeQuery = url.searchParams.toString();
    const resume = resolveResume(resumeQuery);
    if (!resume)
      return c.html(
        <AuthErrorPage
          description="Open the sign-in link from the app or client you came from."
          error="invalid_request"
        />,
        400,
      );
    const session = await betterAuthServer.api.getSession({ headers: c.req.raw.headers });
    if (session) return c.redirect(resume.url);
    const email = url.searchParams.get('email') ?? '';
    const step =
      url.searchParams.get('step') === 'otp' && emailSchema.safeParse(email).success
        ? 'otp'
        : 'email';
    return c.html(
      <LoginPage
        email={email}
        error={url.searchParams.get('error') ?? undefined}
        mode={resume.mode}
        resumeQuery={resumeQuery}
        step={step}
      />,
    );
  })
  .get('/consent', async (c) => {
    const query = new URL(c.req.url).searchParams.toString();
    const consent = resolveConsentQuery(query);
    if (!consent) return c.html(<AuthErrorPage error="invalid_request" />, 400);
    const session = await betterAuthServer.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.redirect(new URL(`/login?${query}`, env.API_URL).toString(), 303);
    const clientResponse = await betterAuthServer.handler(
      new Request(
        `${env.API_URL}/api/auth/oauth2/public-client?client_id=${encodeURIComponent(consent.clientId)}`,
        { headers: c.req.raw.headers },
      ),
    );
    const client = clientResponse.ok
      ? ((await clientResponse.json()) as { name?: string | null })
      : null;
    return c.html(
      <ConsentPage
        clientName={client?.name ?? consent.clientId}
        query={consent.query}
        scopes={consent.scopes}
      />,
    );
  })
  .get('/error', (c) =>
    c.html(
      <AuthErrorPage description={c.req.query('error_description')} error={c.req.query('error')} />,
    ),
  )
  .get('/logout', async (c) => {
    const session = await betterAuthServer.api.getSession({ headers: c.req.raw.headers });
    return c.html(<LogoutPage signedOut={!session} />);
  })
  .post('/logout', async (c) => {
    const response = await callBetterAuth({ body: {}, path: '/sign-out', request: c.req.raw });
    const pageResponse = await c.html(<LogoutPage signedOut />);
    const headers = copySetCookieHeaders(response.headers);
    headers.set('content-type', pageResponse.headers.get('content-type') ?? 'text/html');
    return new Response(await pageResponse.text(), { status: 200, headers });
  })
  .post('/login/send', async (c) => {
    const form = await c.req.parseBody();
    const email = getFormValue(form, 'email');
    const resumeQuery = getFormValue(form, 'resume');
    if (!resolveResume(resumeQuery) || !emailSchema.safeParse(email).success)
      return c.redirect(
        loginUrl({ error: 'Enter a valid email address.', resumeQuery, step: 'email' }),
        303,
      );
    const response = await callBetterAuth({
      body: { email, type: 'sign-in' },
      path: '/email-otp/send-verification-otp',
      request: c.req.raw,
    });
    if (!response.ok)
      return c.redirect(
        loginUrl({
          email,
          error: 'Unable to send a verification code. Try again.',
          resumeQuery,
          step: 'email',
        }),
        303,
      );
    return c.redirect(loginUrl({ email, resumeQuery, step: 'otp' }), 303);
  })
  .post('/consent/decision', async (c) => {
    const form = await c.req.parseBody();
    const query = getFormValue(form, 'oauth_query');
    const consent = resolveConsentQuery(query);
    if (!consent) return c.html(<AuthErrorPage error="invalid_request" />, 400);
    const response = await callBetterAuth({
      body: { accept: getFormValue(form, 'accept') === 'true', oauth_query: query },
      path: '/oauth2/consent',
      request: c.req.raw,
    });
    if (!response.ok)
      return c.html(<AuthErrorPage error="access_denied" />, response.status as 400);
    const body = (await response.json().catch(() => null)) as {
      redirect_uri?: string;
      redirect?: boolean;
      url?: string;
    } | null;
    const redirectUrl = body?.redirect_uri ?? (body?.redirect ? body.url : undefined);
    if (!redirectUrl) return c.html(<AuthErrorPage error="server_error" />, 500);
    return c.redirect(redirectUrl, 303);
  })
  .post('/login/verify', async (c) => {
    const form = await c.req.parseBody();
    const email = getFormValue(form, 'email');
    const resumeQuery = getFormValue(form, 'resume');
    const otp = getFormValue(form, 'otp');
    const resume = resolveResume(resumeQuery);
    if (!resume || !emailSchema.safeParse(email).success || !otpSchema.safeParse(otp).success)
      return c.redirect(
        loginUrl({
          email,
          error: 'Enter the six-digit verification code.',
          resumeQuery,
          step: 'otp',
        }),
        303,
      );
    const response = await callBetterAuth({
      body: { email, otp },
      path: '/sign-in/email-otp',
      request: c.req.raw,
    });
    if (!response.ok && (response.status < 300 || response.status >= 400))
      return c.redirect(
        loginUrl({
          email,
          error: 'Verification failed. Check your code and try again.',
          resumeQuery,
          step: 'otp',
        }),
        303,
      );
    const headers = new Headers(response.headers);
    headers.set('location', resume.url);
    return new Response(null, { headers, status: 303 });
  });
