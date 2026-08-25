import type React from 'react';
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import { UpdateGuard } from '~/components/update-guard';
import { WEB_BRAND } from '~/lib/brand';
import { AnalyticsProvider } from '~/lib/posthog';
import { TelemetryProvider } from '~/lib/telemetry/telemetry-provider';

import type { Route } from './+types/root';
import { ErrorState } from './components/error-state';

import './globals.css';
import { HonoProvider } from './lib/api';
import { serverEnv } from './lib/env.server';
import { sessionMiddleware } from './lib/middleware';
import './lib/i18n';

const ICON_VERSION = '20260407';

const NOTES_ICON_LINKS = [
  { rel: 'icon', type: 'image/x-icon', href: `/icons/favicon.ico?v=${ICON_VERSION}` },
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

export async function loader() {
  return data({
    apiBaseUrl: serverEnv.VITE_PUBLIC_API_URL,
  });
}

export const middleware: Route.MiddlewareFunction[] = [
  (args, next) => sessionMiddleware(args, next),
];

export const meta: Route.MetaFunction = () => {
  return [
    { title: WEB_BRAND.meta.title },
    { name: 'description', content: WEB_BRAND.meta.description },
  ];
};

export const links: Route.LinksFunction = () => [...NOTES_ICON_LINKS];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
  const { apiBaseUrl } = loaderData;

  return (
    <HonoProvider baseUrl={apiBaseUrl}>
      <TelemetryProvider>
        <AnalyticsProvider>
          <UpdateGuard logo={WEB_BRAND.logoPath} appName={WEB_BRAND.appName}>
            <Outlet />
          </UpdateGuard>
        </AnalyticsProvider>
      </TelemetryProvider>
    </HonoProvider>
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
    details = error.message || details;
    stack = error.stack;
  }

  return (
    <main className="container flex min-h-screen items-center justify-center p-4">
      <ErrorState
        title={message}
        message={details}
        actionLabel="Reload"
        onAction={() => window.location.reload()}
        stack={
          stack ? (
            <pre className="w-full p-4 overflow-x-auto">
              <code>{stack}</code>
            </pre>
          ) : null
        }
      />
    </main>
  );
}
