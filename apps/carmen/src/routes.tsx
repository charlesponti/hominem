import * as ROUTES from 'src/lib/routes'
import { createRoute } from 'react-router'
import { matchPath } from 'react-router-dom'

// Helper for protected routes
export const isProtectedRoute = (pathname: string) => {
  const publicRoutes = [ROUTES.LANDING, ROUTES.LOGIN, ROUTES.AUTHENTICATE]
  return !publicRoutes.some((route) => matchPath(route, pathname))
}

// Root routes
export const rootRoute = createRoute({
  path: '/',
  component: () => import('./layout').then((mod) => ({ Component: mod.default })),
})

// Landing page
export const landingRoute = createRoute({
  path: ROUTES.LANDING,
  parentRoute: rootRoute,
  component: () => import('./scenes/index').then((mod) => ({ Component: mod.default })),
})

// Login
export const loginRoute = createRoute({
  path: ROUTES.LOGIN,
  parentRoute: rootRoute,
  component: () => import('./scenes/login').then((mod) => ({ Component: mod.default })),
})

// Authentication
export const authenticateRoute = createRoute({
  path: ROUTES.AUTHENTICATE,
  parentRoute: rootRoute,
  component: () => import('./scenes/authenticate').then((mod) => ({ Component: mod.default })),
})

// Dashboard
export const dashboardRoute = createRoute({
  path: ROUTES.DASHBOARD,
  parentRoute: rootRoute,
  component: () => import('./scenes/dashboard').then((mod) => ({ Component: mod.default })),
})

// Account
export const accountRoute = createRoute({
  path: ROUTES.ACCOUNT,
  parentRoute: rootRoute,
  component: () => import('./scenes/account').then((mod) => ({ Component: mod.default })),
})

// Invites
export const invitesRoute = createRoute({
  path: ROUTES.INVITES,
  parentRoute: rootRoute,
  component: () => import('./scenes/invites').then((mod) => ({ Component: mod.default })),
})

// Lists
export const listsRoute = createRoute({
  path: ROUTES.LISTS,
  parentRoute: rootRoute,
  component: () => import('./scenes/lists').then((mod) => ({ Component: mod.default })),
})

// Single List
export const listRoute = createRoute({
  path: ROUTES.LIST,
  parentRoute: rootRoute,
  component: () => import('./scenes/lists/list').then((mod) => ({ Component: mod.default })),
})

// List Invites
export const listInviteRoute = createRoute({
  path: ROUTES.LIST_INVITE,
  parentRoute: rootRoute,
  component: () =>
    import('./scenes/lists/list/invites').then((mod) => ({ Component: mod.default })),
})

// Place
export const placeRoute = createRoute({
  path: ROUTES.PLACE,
  parentRoute: rootRoute,
  component: () => import('./scenes/place').then((mod) => ({ Component: mod.default })),
})

// Not Found
export const notFoundRoute = createRoute({
  path: ROUTES.WILDCARD,
  parentRoute: rootRoute,
  component: () => import('./scenes/not-found').then((mod) => ({ Component: mod.default })),
})

// Export all routes
export const routes = [
  rootRoute,
  landingRoute,
  loginRoute,
  authenticateRoute,
  dashboardRoute,
  accountRoute,
  invitesRoute,
  listsRoute,
  listRoute,
  listInviteRoute,
  placeRoute,
  notFoundRoute,
]
