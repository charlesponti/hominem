import { index, layout, type RouteConfig, route } from '@react-router/dev/routes'

export default [
  // API Routes
  route('api/life-events/events', 'routes/api/life-events/events.ts'),
  route('api/life-events/events/:id', 'routes/api/life-events/events.$id.ts'),
  route('api/life-events/people', 'routes/api/life-events/people.ts'),
  route('api/life-events/tags', 'routes/api/life-events/tags.ts'),
  route('api/calendar/sync', 'routes/api/calendar/sync.ts'),
  route('api/upload', 'routes/api.upload.ts'),
  route('api/transcribe', 'routes/api.transcribe.ts'),
  route('api/speech', 'routes/api.speech.ts'),
  route('api/auth/google', 'routes/api/auth/google.ts'),

  layout('routes/layout.tsx', [
    index('routes/home.tsx'),

    // Chat Routes
    route('chat', 'routes/chat/index.tsx'),
    route('chat/:chatId', 'routes/chat/chat.$chatId.tsx'),

    // Other Routes
    layout('routes/notes/layout.tsx', [route('notes', 'routes/notes/page.tsx')]),
    route('/content-strategy', 'routes/content-strategy/saved.tsx'),
    route('/content-strategy/create', 'routes/content-strategy/create.tsx'),
    route('/content-strategy/:id', 'routes/content-strategy/view.tsx'),
    route('/goals', 'routes/goals/page.tsx'),
    route('/habits', 'routes/habits/page.tsx'),
    route('/life-events', 'routes/life-events.tsx'),
    route('/life-events/people', 'routes/life-events.people.tsx'),
    route('/calendar', 'routes/calendar.tsx'),
    route('/account', 'routes/account.tsx'),

    // Auth Routes
    route('/auth/signin', 'routes/auth/signin.tsx'),
    route('/auth/google', 'routes/auth/google.tsx'),
    route('/auth/callback', 'routes/auth.callback.tsx'),
  ]),
] as RouteConfig
