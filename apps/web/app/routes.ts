import { index, layout, type RouteConfig, route } from '@react-router/dev/routes';

export default [
  // API Routes (specific handlers)
  route('api/upload', 'routes/api.upload.ts'),
  route('api/transcribe', 'routes/api.transcribe.ts'),
  route('api/speech', 'routes/api.speech.ts'),
  route('api/chat-ui/:chatId', 'routes/api.chat-ui.$chatId.ts'),
  route('api/auth/google', 'routes/api/auth/google.ts'),

  layout('routes/auth/layout.tsx', [
    route('/auth', 'routes/auth/index.tsx'),
    route('/auth/verify', 'routes/auth/verify.tsx'),
    route('/auth/logout', 'routes/auth/logout.tsx'),
    route('/auth/passkey/callback', 'routes/auth/passkey.callback.tsx'),
    route('/auth/google', 'routes/auth/google.tsx'),
  ]),

  layout('routes/layout.tsx', [
    index('routes/home.tsx'),

    // Chat Routes
    route('chat', 'routes/chat/index.tsx'),
    route('chat/:chatId', 'routes/chat/chat.$chatId.tsx'),

    // Notes Routes
    layout('routes/notes/layout.tsx', [
      route('notes', 'routes/notes/page.tsx'),
      route('notes/new', 'routes/notes/new.tsx'),
      route('notes/:noteId', 'routes/notes/$noteId.tsx'),
      route('notes/:noteId/edit', 'routes/notes/$noteId_.edit.tsx'),
      route('notes/:noteId/chat', 'routes/notes/$noteId.chat.tsx'),
    ]),

    route('/account', 'routes/account.tsx'),
    route('/settings/security', 'routes/settings.security.tsx'),

    // Catch-all 404 route
    route('*', 'routes/$.tsx'),
  ]),
] as RouteConfig;
