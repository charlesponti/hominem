import { index, layout, type RouteConfig, route } from '@react-router/dev/routes'

export default [
  route('api/trpc/*', './routes/api/trpc.ts'),

  // Auth callback route (outside layout to avoid auth checks)
  route('auth/callback', './routes/auth.callback.tsx'),

  // Main layout with global UI elements
  layout('routes/layout.tsx', [
    // Public routes
    index('./routes/index.tsx'),

    // About page
    route('about', './routes/about.tsx'),

    // Trips section
    route('trips', './routes/trips._index.tsx'),
    route('trips/create', './routes/trips.create.tsx'),
    route('trips/:tripId', './routes/trips.$tripId.tsx'),

    // Account management
    route('account', './routes/account.tsx'),

    // Invites section
    route('invites', './routes/invites.tsx'),

    // Lists
    route('lists', './routes/lists._index.tsx'),
    route('lists/:id', './routes/lists.$id.tsx'),
    route('lists/:id/invites', './routes/lists.$id.invites.tsx'),
    route('lists/:id/invites/sent', './routes/lists.$id.invites.sent.tsx'),

    // Places section with dynamic routes
    route('places/:id', './routes/places.$id.tsx'),

    route('*', './routes/$.tsx'),
  ]),
] satisfies RouteConfig
