import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),
    route('/finance', 'routes/finance/page.tsx'),
    route('/finance/import', 'routes/finance/import/page.tsx'),
    route('/finance/runway', 'routes/finance/runway/page.tsx'),
    route('/finance/budget', 'routes/finance/budget/page.tsx'),
    route('/finance/location-comparison', 'routes/finance/location-comparison/page.tsx'),
    route('/finance/analytics', 'routes/finance/analytics/page.tsx'),
    route('/finance/feed', 'routes/finance/feed/page.tsx'),
    route('/notes', 'routes/notes/layout.tsx'),
    route('/health', 'routes/health.tsx'),
    route('/auth/cli', 'routes/auth/cli.tsx'),
  ]),
] as RouteConfig
