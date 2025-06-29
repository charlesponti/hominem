import { type RouteConfig, index, layout, prefix, route } from '@react-router/dev/routes'

export default [
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),
    layout('routes/budget._layout.tsx', [
      ...prefix('/budget', [
        index('routes/budget.tsx'),
        route('categories', 'routes/budget.categories.tsx'),
        route('impact', 'routes/budget.impact.tsx'),
        route('tracking', 'routes/budget.tracking.tsx'),
      ]),
    ]),

    route('finance', 'routes/finance.tsx'),
    route('import', 'routes/import.tsx'),

    // Accounts
    route('accounts', 'routes/accounts.tsx'),
    route('accounts/:id', 'routes/accounts.$id.tsx'),

    // Analytics
    route('analytics', 'routes/analytics.tsx'),
    route('analytics/monthly/:month', 'routes/analytics.monthly.$month.tsx'),
    route('analytics/category/:category', 'routes/analytics.category.$category.tsx'),
    route('analytics/categories', 'routes/analytics.categories.tsx'),

    // Random
    route('finance/runway', 'routes/finance.runway.tsx'),
    route('finance/location-comparison', 'routes/finance.location-comparison.tsx'),

    route('/account', 'routes/account.tsx'),
    route('/auth/cli', 'routes/auth.cli.tsx'),
    route('/auth/callback', 'routes/auth.callback.tsx'),
    route('/api/auth/validate-token', 'routes/api.auth.validate-token.ts', {
      action: 'routes/api.auth.validate-token.server.ts',
    }),
    route('/api/auth/refresh-token', 'routes/api.auth.refresh-token.ts', {
      action: 'routes/api.auth.refresh-token.server.ts',
    }),
  ]),
] as RouteConfig
