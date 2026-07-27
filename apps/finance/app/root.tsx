import { AuthProvider } from '@hominem/auth/client/provider';
import { Button, buttonVariants, Card, CardContent } from '@ponti-studios/ui/primitives';
import { colorThemes } from '@ponti-studios/ui/tokens';
import type React from 'react';
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

import { COMMON_FONT_LINKS, COMMON_ICON_LINKS, UpdateGuard } from '~/components/patterns';

import type { Route } from './+types/root';
import { HonoProvider } from './lib/api';
import { authConfig, getServerSession } from './lib/auth.server';
import { serverEnv } from './lib/env';

import './globals.css';

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await getServerSession(request);

  return data(
    {
      user,
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
    { title: 'Florin' },
    { name: 'description', content: 'Manage your personal finances with Florin' },
    { name: 'theme-color', content: colorThemes.light.background },
  ];
};

export const links: Route.LinksFunction = () => [...COMMON_FONT_LINKS, ...COMMON_ICON_LINKS];

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

export default function App({ loaderData }: Route.ComponentProps) {
  const { authEnv, apiBaseUrl } = loaderData;

  return (
    <AuthProvider config={authEnv}>
      <HonoProvider baseUrl={apiBaseUrl}>
        <UpdateGuard>
          <Outlet />
        </UpdateGuard>
      </HonoProvider>
    </AuthProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
          <Card className="w-full max-w-md border-border bg-card text-center">
            <CardContent className="space-y-4 p-6">
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
        <Card className="w-full max-w-md border-border bg-card text-center">
          <CardContent className="space-y-4 p-6">
            <h1 className="display-2 text-destructive">{error.status}</h1>
            <p className="heading-3 text-muted-foreground">{error.statusText}</p>
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
      <Card className="w-full max-w-2xl border-border bg-card">
        <CardContent className="space-y-4 p-6 text-center">
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
