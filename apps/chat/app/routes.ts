import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),
    route('/chat', 'routes/chat/page.tsx'),
    route('/about', 'routes/about.tsx'),
    route('/profile', 'routes/profile/page.tsx'),
    route('/auth/signin', 'routes/auth/page.tsx'),
    route('/auth/signup', 'routes/auth/page.tsx'),
  ]),
  // API Routes
  route('/api/chat-stream', 'routes/api/chat-stream.ts'),
  route('/api/search', 'routes/api/search.ts'),
  route('/api/upload', 'routes/api/upload.ts'),
  route('/api/transcribe', 'routes/api/transcribe.ts'),
  route('/api/speech', 'routes/api/speech.ts'),
  route('/api/chats', 'routes/api/chats.ts'),
  route('/api/chats/:chatId', 'routes/api/chats.$chatId.ts'),
  route('/api/files/:fileId', 'routes/api/files.$fileId.ts'),
  route('/api/metrics', 'routes/api/metrics.ts'),
  route('/health', 'routes/health.tsx'),
] as RouteConfig
