import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),
    route('/chat', 'routes/chat/page.tsx'),
    route('/about', 'routes/about.tsx'),
    route('/profile', 'routes/profile/page.tsx'),
  ]),
] as RouteConfig
