import { index, layout, type RouteConfig, route } from '@react-router/dev/routes';

export default [
  // API Routes
  route('api/upload', 'routes/api.upload.ts'),
  route('api/transcribe', 'routes/api.transcribe.ts'),
  route('api/speech', 'routes/api.speech.ts'),
  route('api/auth/google', 'routes/api/auth/google.ts'),
  route('api/*', 'routes/api.proxy.ts'),

  layout('routes/layout.tsx', [
    index('routes/home.tsx'),
    route('workspace', 'routes/workspace.tsx'),

    // Chat Routes
    route('chat', 'routes/chat/index.tsx'),
    route('chat/:chatId', 'routes/chat/chat.$chatId.tsx'),

    // Other Routes
    layout('routes/notes/layout.tsx', [
      route('notes', 'routes/notes/page.tsx'),
      route('tasks', 'routes/tasks/page.tsx'),
    ]),
    route('/goals', 'routes/goals/page.tsx'),
    route('/habits', 'routes/habits/page.tsx'),
    route('/events', 'routes/events.tsx'),
    route('/events/people', 'routes/events.people.tsx'),
    route('/calendar', 'routes/calendar.tsx'),
    route('/account', 'routes/account.tsx'),

    // Auth Routes
    route('/auth/google', 'routes/auth/google.tsx'),
    route('/auth/callback', 'routes/auth.callback.tsx'),

    // Catch-all 404 route
    route('*', 'routes/$.tsx'),
  ]),
] as RouteConfig;
