import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),
    layout('routes/notes/layout.tsx', [route('notes', 'routes/notes/page.tsx')]),
    route('/account', 'routes/account.tsx'),
  ]),
] as RouteConfig
