import { index, layout, type RouteConfig, route } from '@react-router/dev/routes'

export default [
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),
    route('about', 'routes/about.tsx'),

    // Chat routes
    route('chat', 'routes/chat.tsx'),
    route('chat/:chatId', 'routes/chat.$chatId.tsx'),

    // Profile
    route('profile', 'routes/profile.tsx'),

    // API Routes
    route('api/upload', 'routes/api.upload.ts'),
    route('api/transcribe', 'routes/api.transcribe.ts'),
    route('api/speech', 'routes/api.speech.ts'),

    // Auth routes
    route('/auth/callback', 'routes/auth.callback.tsx'),
  ]),
] as RouteConfig
