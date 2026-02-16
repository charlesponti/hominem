import type { AuthChangeEvent } from '@supabase/supabase-js';
import type React from 'react';

import { SupabaseAuthProvider } from '@hominem/auth';
import { COMMON_FONT_LINKS, COMMON_ICON_LINKS, UpdateGuard } from '@hominem/ui';
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

import type { Route } from './+types/root';

import { authConfig, getServerSession } from './lib/auth.server';
import { HonoProvider } from './lib/api';
import './globals.css';

export async function loader({ request }: Route.LoaderArgs) {
  const { session, headers } = await getServerSession(request);

  return data(
    {
      session,
      supabaseEnv: {
        url: authConfig.supabaseUrl,
        anonKey: authConfig.supabaseAnonKey,
      },
      apiBaseUrl: authConfig.supabaseUrl.replace('/api', ''),
    },
    { headers },
  );
}

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Florin' },
    { name: 'description', content: 'Manage your personal finances with Florin' },
  ];
};

export const links: Route.LinksFunction = () => [...COMMON_FONT_LINKS, ...COMMON_ICON_LINKS];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, user-scalable=no, maximum-scale=1"
        />
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
  const { session, supabaseEnv, apiBaseUrl } = loaderData;
  const revalidator = useRevalidator();
  const clearOfflineCaches = useCallback(async () => {
    if (!('caches' in window)) {
      return;
    }
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }, []);

  const handleAuthEvent = useCallback(
    (event: AuthChangeEvent) => {
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
    <SupabaseAuthProvider
      initialSession={session}
      config={supabaseEnv}
      onAuthEvent={handleAuthEvent}
    >
      <HonoProvider baseUrl={apiBaseUrl}>
        <UpdateGuard logo="/logo-florin.png" appName="Florin">
          <Outlet />
        </UpdateGuard>
      </HonoProvider>
    </SupabaseAuthProvider>
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
