import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),
    route('about', 'routes/about.tsx'),
    route('health', 'routes/health.tsx'),

    // Chat routes with their own layout
    layout('routes/chat._layout.tsx', [
      route('chat', 'routes/chat.tsx'),
      route('chat/:chatId', 'routes/chat.$chatId.tsx'),
    ]),

    // Profile
    route('profile', 'routes/profile.tsx'),

    // API Routes
    route('api/upload', 'routes/api.upload.ts'),
    route('api/vector-search', 'routes/api.vector-search.ts'),
    route('api/search', 'routes/api.search.ts'),
    route('api/metrics', 'routes/api.metrics.ts'),
    route('api/chats', 'routes/api.chats.ts'),
    route('api/chats/:chatId', 'routes/api.chats.$chatId.ts'),
    route('api/transcribe', 'routes/api.transcribe.ts'),
    route('api/speech', 'routes/api.speech.ts'),
    route('api/chat-stream', 'routes/api.chat-stream.ts'),
    route('api/files/:fileId', 'routes/api.files.$fileId.ts'),
  ]),
] as RouteConfig
