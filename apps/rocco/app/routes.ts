import { index, layout, type RouteConfig, route } from '@react-router/dev/routes'

export default [
  route('api/trpc/*', './routes/api/trpc.ts'),

  // Main layout with global UI elements
  layout('routes/layout.tsx', [
    // Public routes
    index('./routes/index.tsx'),

    // Explore route with map
    route('explore', './routes/explore.tsx'),

    // Account management
    route('account', './routes/account.tsx'),

    // Invites section
    route('invites', './routes/invites.tsx'),

    route('lists/create', './routes/lists.create.tsx'),
    route('lists/:id', './routes/lists.$id.tsx'),
    route('lists/:id/invites', './routes/lists.$id.invites.tsx'),
    route('lists/:id/invites/sent', './routes/lists.$id.invites.sent.tsx'),

    // Places section with dynamic routes
    route('places/:id', './routes/places.$id.tsx'),
  ]),
] satisfies RouteConfig
