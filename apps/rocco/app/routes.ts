import { index, layout, type RouteConfig, route } from '@react-router/dev/routes';

export default [
  route('api/images', './routes/api/images.ts'),

  // Auth routes
  route('auth', './routes/auth/index.tsx'),
  route('auth/verify', './routes/auth/verify.tsx'),
  route('auth/logout', './routes/auth/logout.tsx'),
  route('auth/passkey/callback', './routes/auth/passkey.callback.tsx'),
  route('settings/security', './routes/settings.security.tsx'),

  // Main layout with global UI elements
  layout('routes/layout.tsx', [
    // Public routes
    index('./routes/index.tsx'),

    // About page
    route('about', './routes/about.tsx'),

    // Account management
    route('account', './routes/account.tsx'),

    // Invites section
    route('invites', './routes/invites.tsx'),

    // Visits section
    route('visits', './routes/visits.tsx'),

    // Lists
    route('lists', './routes/lists._index.tsx'),
    route('lists/:id', './routes/lists.$id.tsx'),
    route('lists/:id/invites', './routes/lists.$id.invites.tsx'),
    route('lists/:id/invites/sent', './routes/lists.$id.invites.sent.tsx'),

    // Places section with dynamic routes
    route('places/:id', './routes/places.$id.tsx'),

    route('admin', './routes/admin.tsx'),

    route('*', './routes/$.tsx'),
  ]),
] satisfies RouteConfig;
