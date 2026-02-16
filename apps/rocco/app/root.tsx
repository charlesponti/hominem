import type { AuthChangeEvent } from '@supabase/supabase-js';

import { SupabaseAuthProvider } from '@hominem/auth';
import { COMMON_FONT_LINKS, COMMON_ICON_LINKS, UpdateGuard } from '@hominem/ui';
import { useCallback } from 'react';
import {
  data,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRevalidator,
} from 'react-router';

import type { Route } from './+types/root';

import ErrorBoundary from './components/ErrorBoundary';
import './globals.css';
import { HonoProvider } from './lib/api';

export async function loader({ request }: Route.LoaderArgs) {
  const { getServerSession } = await import('./lib/auth.server');
  const { session, headers } = await getServerSession(request);

  return data(
    {
      session,
    },
    { headers },
  );
}

export const links: Route.LinksFunction = () => [...COMMON_FONT_LINKS, ...COMMON_ICON_LINKS];

export const meta = () => [
  { title: 'rocco' },
  { name: 'description', content: 'rocco' },
  { name: 'theme-color', content: '#000000' },
  { name: 'apple-mobile-web-app-capable', content: 'yes' },
  { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
  { name: 'apple-mobile-web-app-title', content: 'Rocco' },
  { name: 'mobile-web-app-capable', content: 'yes' },
  { property: 'og:title', content: 'rocco' },
  { property: 'og:description', content: 'Your personal place list' },
  { property: 'og:type', content: 'website' },
  { name: 'twitter:card', content: 'summary_large_image' },
];

export default function App({ loaderData }: Route.ComponentProps) {
  const { session } = loaderData;
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

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!(supabaseUrl && supabaseAnonKey)) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }

  const supabaseConfig = {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  };

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
        <SupabaseAuthProvider
          initialSession={session}
          config={supabaseConfig}
          onAuthEvent={handleAuthEvent}
        >
          <HonoProvider>
            <UpdateGuard logo="/icons/apple-touch-icon-152x152.png" appName="Rocco">
              <Outlet />
            </UpdateGuard>
          </HonoProvider>
        </SupabaseAuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export { ErrorBoundary };
