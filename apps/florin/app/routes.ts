import { type RouteConfig, index, layout, route } from '@react-router/dev/routes'

export default [
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),
    layout('routes/finance/layout.tsx', [
      route('feed', 'routes/finance/feed/page.tsx'),
      route('finance', 'routes/finance/page.tsx'),
      route('finance/import', 'routes/finance/import/page.tsx'),

      route('/finance/banks', 'routes/finance/banks/page.tsx'),

      // Accounts
      route('accounts', 'routes/accounts/page.tsx'),

      // Budget
      route('budget', 'routes/budget/page.tsx'),
      route('budget/tracking', 'routes/budget/tracking/page.tsx'),

      // Analytics
      route('analytics', 'routes/analytics/page.tsx'),
      route('analytics/monthly/:month', 'routes/analytics/monthly/[month]/page.tsx'),
      route('analytics/category/:category', 'routes/analytics/category/[category]/page.tsx'),
      route('analytics/categories', 'routes/analytics/categories/page.tsx'),

      // Random
      route('finance/runway', 'routes/finance/runway/page.tsx'),
      route('finance/location-comparison', 'routes/finance/location-comparison/page.tsx'),
    ]),
    route('/account', 'routes/account.tsx'),
    route('/auth/cli', 'routes/auth/cli.tsx'),
  ]),
] as RouteConfig
