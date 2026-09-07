import { index, layout, type RouteConfig, route } from '@react-router/dev/routes';

export default [
  route('health', 'routes/health.ts'),

  // API Routes (specific handlers)
  route('api/auth/google', 'routes/api/auth/google.ts'),
  route('api/usage', 'routes/api/usage.ts'),
  route('api/usage-timeseries', 'routes/api/usage-timeseries.ts'),

  // Hosted-login shims — the API's hosted /login page owns the OTP surface.
  route('/auth', 'routes/auth/index.tsx'),
  route('/logout', 'routes/auth/logout.tsx'),

  layout('routes/_authenticated.tsx', [
    layout('routes/layout.tsx', [
      index('routes/home.tsx'),
      route('chats', 'routes/chats.tsx'),
      route('chat/:chatId', 'routes/chat/chat.$chatId.tsx'),
      route('collections', 'routes/collections/collections.tsx'),
      route('collections/:collectionId', 'routes/collections/collections.$collectionId.tsx'),
      route('settings', 'routes/settings.tsx'),
      route('settings/archived-chats', 'routes/settings.archived-chats.tsx'),
      route('settings/memories', 'routes/settings.memories.tsx'),
      route('usage', 'routes/usage.tsx'),
    ]),
  ]),

  // Catch-all 404 route
  route('*', 'routes/$.tsx'),
] satisfies RouteConfig;
