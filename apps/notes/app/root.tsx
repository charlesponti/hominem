import { AuthProvider } from '@hominem/auth';
import { COMMON_FONT_LINKS, UpdateGuard } from '@hominem/ui';
import type React from 'react';
import { useCallback } from 'react';
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRevalidator,
} from 'react-router';

import { FeatureFlagsProvider } from '~/lib/hooks/use-feature-flags';

import type { Route } from './+types/root';

import './globals.css';
import { HonoProvider } from './lib/api';
import { authConfig, getServerSession } from './lib/auth.server';
import './lib/i18n';
import { serverEnv } from './lib/env';

const ICON_VERSION = '20260314';

const NOTES_ICON_LINKS = [
  { rel: 'icon', type: 'image/x-icon', href: `/favicon.ico?v=${ICON_VERSION}` },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '16x16',
    href: `/icons/favicon-16x16.png?v=${ICON_VERSION}`,
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '32x32',
    href: `/icons/favicon-32x32.png?v=${ICON_VERSION}`,
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '96x96',
    href: `/icons/favicon-96x96.png?v=${ICON_VERSION}`,
  },
  { rel: 'apple-touch-icon', href: `/icons/apple-touch-icon.png?v=${ICON_VERSION}` },
  {
    rel: 'apple-touch-icon',
    sizes: '180x180',
    href: `/icons/apple-touch-icon-180x180.png?v=${ICON_VERSION}`,
  },
  { rel: 'manifest', href: `/manifest.json?v=${ICON_VERSION}` },
] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const { user, session, headers } = await getServerSession(request);

  return data(
    {
      user,
      session,
      authEnv: {
        apiBaseUrl: authConfig.apiBaseUrl,
      },
      apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
    },
    { headers },
  );
}

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Animus' },
    { name: 'description', content: 'Organize and manage your personal notes and knowledge' },
  ];
};

export const links: Route.LinksFunction = () => [...COMMON_FONT_LINKS, ...NOTES_ICON_LINKS];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { authEnv, apiBaseUrl, session, user } = loaderData;
  const revalidator = useRevalidator();
  const clearOfflineCaches = useCallback(async () => {
    if (!('caches' in window)) {
      return;
    }
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }, []);

  const handleAuthEvent = useCallback(
    (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED') => {
      if (event === 'SIGNED_OUT') {
        void clearOfflineCaches();
      }
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        revalidator.revalidate();
      }
    },
    [clearOfflineCaches, revalidator],
  );

  return (
    <AuthProvider
      config={authEnv}
      onAuthEvent={handleAuthEvent}
      initialUser={user}
      initialSession={session}
    >
      <HonoProvider baseUrl={apiBaseUrl}>
        <FeatureFlagsProvider>
          <UpdateGuard logo="/logo.png" appName="Notes">
            <Outlet />
          </UpdateGuard>
        </FeatureFlagsProvider>
      </HonoProvider>
    </AuthProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404 ? 'The requested page could not be found.' : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
