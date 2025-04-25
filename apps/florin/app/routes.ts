import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),
    layout('routes/finance/layout.tsx', [
      route('/finance', 'routes/finance/page.tsx', [
        route('import', 'routes/finance/import/page.tsx'),
        route('runway', 'routes/finance/runway/page.tsx'),
        route('budget', 'routes/finance/budget/page.tsx'),
        route('location-comparison', 'routes/finance/location-comparison/page.tsx'),
        route('analytics', 'routes/finance/analytics/page.tsx'),
        route('feed', 'routes/finance/feed/page.tsx'),
      ]),
    ]),
    layout('routes/notes/layout.tsx', [route('notes', 'routes/notes/page.tsx')]),
    route('/auth/cli', 'routes/auth/cli.tsx'),
  ]),
] as RouteConfig
