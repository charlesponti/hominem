import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),
    layout('routes/notes/layout.tsx', [route('notes', 'routes/notes/page.tsx')]),
    route('/content-strategy', 'routes/content-strategy/saved.tsx'),
    route('/content-strategy/create', 'routes/content-strategy/create.tsx'),
    route('/content-strategy/:id', 'routes/content-strategy/view.tsx'),
    route('/goals', 'routes/goals/page.tsx'),
    route('/habits', 'routes/habits/page.tsx'),
    route('/account', 'routes/account.tsx'),
    route('/auth/callback', 'routes/auth.callback.tsx'),
  ]),
] as RouteConfig
