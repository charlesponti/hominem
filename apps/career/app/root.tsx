import { Button, buttonVariants, Card, CardContent } from '@ponti-studios/ui/primitives';
import { colorThemes } from '@ponti-studios/ui/tokens';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  data,
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import type { Route } from './+types/root';
import Navigation from './components/Navigation';

import './app.css';
import { NavigationProgress } from './components/NavigationProgress';
import { serverEnv } from './lib/env.server';
import { sessionMiddleware, userContext } from './lib/middleware';

export const links = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
  // Favicon
  { rel: 'icon', type: 'image/x-icon', href: '/icons/favicon.ico' },
  { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/favicon-16x16.png' },
  { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/favicon-32x32.png' },
  { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/icons/favicon-96x96.png' },

  // Apple Touch Icons
  { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
  { rel: 'apple-touch-icon', sizes: '57x57', href: '/icons/apple-touch-icon-57x57.png' },
  { rel: 'apple-touch-icon', sizes: '60x60', href: '/icons/apple-touch-icon-60x60.png' },
  { rel: 'apple-touch-icon', sizes: '72x72', href: '/icons/apple-touch-icon-72x72.png' },
  { rel: 'apple-touch-icon', sizes: '76x76', href: '/icons/apple-touch-icon-76x76.png' },
  { rel: 'apple-touch-icon', sizes: '114x114', href: '/icons/apple-touch-icon-114x114.png' },
  { rel: 'apple-touch-icon', sizes: '120x120', href: '/icons/apple-touch-icon-120x120.png' },
  { rel: 'apple-touch-icon', sizes: '144x144', href: '/icons/apple-touch-icon-144x144.png' },
  { rel: 'apple-touch-icon', sizes: '152x152', href: '/icons/apple-touch-icon-152x152.png' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon-180x180.png' },

  // Android Icons
  { rel: 'icon', type: 'image/png', sizes: '36x36', href: '/icons/android-icon-36x36.png' },
  { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/icons/android-icon-48x48.png' },
  { rel: 'icon', type: 'image/png', sizes: '72x72', href: '/icons/android-icon-72x72.png' },
  { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/icons/android-icon-96x96.png' },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '144x144',
    href: '/icons/android-icon-144x144.png',
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '192x192',
    href: '/icons/android-icon-192x192.png',
  },

  // Web Manifest
  { rel: 'manifest', href: '/manifest.json' },
];

export const meta = () => [
  // Theme Color
  { name: 'theme-color', content: colorThemes.light.background },

  // Microsoft Tile Icons
  { name: 'msapplication-TileColor', content: colorThemes.light.background },
  { name: 'msapplication-TileImage', content: '/icons/ms-icon-144x144.png' },
  { name: 'msapplication-square70x70logo', content: '/icons/ms-icon-70x70.png' },
  { name: 'msapplication-square150x150logo', content: '/icons/ms-icon-150x150.png' },
  { name: 'msapplication-square310x310logo', content: '/icons/ms-icon-310x310.png' },

  // Social Media / OpenGraph
  { property: 'og:image', content: '/icons/og-image.jpg' },
  { property: 'og:image:width', content: '1200' },
  { property: 'og:image:height', content: '630' },

  // Twitter Card
  { name: 'twitter:card', content: 'summary_large_image' },
  { name: 'twitter:image', content: '/icons/twitter-card.jpg' },
];

export const middleware: Route.MiddlewareFunction[] = [
  (args, next) => sessionMiddleware(args, next),
];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);

  return data({
    user,
    hasProfile: Boolean(user),
    apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
  });
}

// Add route handle to enable accessing loader data from child routes
export const handle = {
  id: 'root',
};

const themeBootScript = `
(() => {
  const root = document.documentElement;
  const mode = localStorage.getItem('hominem:ui-color-mode') || root.getAttribute('data-color-mode') || 'system';

  root.setAttribute('data-color-system', 'ponti');

  if (mode === 'light' || mode === 'dark') {
    root.setAttribute('data-color-mode', mode);
  } else {
    root.removeAttribute('data-color-mode');
  }
})();
`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-color-system="ponti" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <Meta />
        <Links />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Instantiate a single QueryClient for the app
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationProgress />
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navigation />
        {/* Single page frame: all routes inherit this width + padding. Do not re-add container/px/py shells in routes. */}
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  if (isRouteErrorResponse(error)) {
    const err = error;
    if (err.status === 404) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
          <Card>
            <CardContent>
              <h1 className="display-2 text-foreground">404</h1>
              <p className="heading-3 text-muted-foreground">Page Not Found</p>
              <Link to="/" className={buttonVariants({ size: 'lg' })}>
                Go Home
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
        <Card>
          <CardContent>
            <h1 className="display-2 text-destructive">{err.status}</h1>
            <p className="heading-3 text-muted-foreground">{err.statusText}</p>
            <Link to="/" className={buttonVariants({ variant: 'destructive', size: 'lg' })}>
              Go Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  const isDev = import.meta.env.DEV;
  const message = isDev && error instanceof Error ? error.message : 'An unexpected error occurred.';
  const stack = isDev && error instanceof Error ? error.stack : null;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <Card>
        <CardContent>
          <h1 className="heading-1 text-foreground">Oops!</h1>
          <p className="body-3 text-muted-foreground">{message}</p>
          {stack && (
            <pre className="max-h-48 w-full overflow-auto rounded-md border border-destructive/30 bg-muted p-4 text-left body-3 text-foreground">
              {stack}
            </pre>
          )}
          <Button asChild variant="default">
            <Link to="/">Go Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
