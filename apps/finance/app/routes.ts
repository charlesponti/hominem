import { index, layout, type RouteConfig, route } from '@react-router/dev/routes';

export default [
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),

    route('finance', 'routes/finance.tsx'),
    route('import', 'routes/import.tsx'),

    // Accounts
    route('accounts', 'routes/accounts.tsx'),
    route('accounts/:id', 'routes/accounts.$id.tsx'),

    // Analytics
    route('analytics', 'routes/analytics.tsx'),
    route('analytics/monthly/:month', 'routes/analytics.monthly.$month.tsx'),
    route('analytics/tag/:tag', 'routes/analytics.tag.$tag.tsx'),
    route('analytics/tags', 'routes/analytics.tags.tsx'),

    // Finance tools
    route('finance/runway', 'routes/finance.runway.tsx'),
    route('/account', 'routes/account.tsx'),
    route('/auth', 'routes/auth/index.tsx'),
    route('/auth/verify', 'routes/auth/verify.tsx'),
    route('/auth/logout', 'routes/auth/logout.tsx'),
    route('/auth/passkey/callback', 'routes/auth/passkey.callback.tsx'),
    route('/settings/security', 'routes/settings.security.tsx'),
    route('/auth/cli', 'routes/auth.cli.tsx'),

    // Catch-all 404 route
    route('*', 'routes/$.tsx'),
  ]),
] as RouteConfig;
