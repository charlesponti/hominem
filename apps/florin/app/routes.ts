import { index, layout, type RouteConfig, route } from '@react-router/dev/routes'

export default [
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),

    route('finance', 'routes/finance.tsx'),
    route('import', 'routes/import.tsx'),

    // Accounts
    route('accounts', 'routes/accounts.tsx'),
    route('accounts/:id', 'routes/accounts.$id.tsx'),

    // Budget
    route('budget', 'routes/budget.tsx'),

    // Analytics
    route('analytics', 'routes/analytics.tsx'),
    route('analytics/monthly/:month', 'routes/analytics.monthly.$month.tsx'),
    route('analytics/category/:category', 'routes/analytics.category.$category.tsx'),
    route('analytics/categories', 'routes/analytics.categories.tsx'),

    // Finance tools
    route('finance/runway', 'routes/finance.runway.tsx'),
    route('/account', 'routes/account.tsx'),
    route('/auth/signin', 'routes/auth/signin.tsx'),
    route('/auth/callback', 'routes/auth.callback.tsx'),
    route('/auth/cli', 'routes/auth.cli.tsx'),
  ]),
] as RouteConfig
