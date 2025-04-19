// Routes for svelte-navigator
import Home from '../routes/Home.svelte'
import Login from '../routes/Login.svelte'
import Dashboard from '../routes/Dashboard.svelte'
import Lists from '../routes/Lists.svelte'
import List from '../routes/List.svelte'
import Place from '../routes/Place.svelte'
import NotFound from '../routes/NotFound.svelte'

// Route definitions for the app
export const routes = {
  '/': Home,
  '/login': Login,
  '/dashboard': Dashboard,
  '/lists': Lists,
  '/lists/:id': List,
  '/place/:id': Place,
  '*': NotFound,
}

// Path constants
export const LANDING = '/'
export const LOGIN = '/login'
export const AUTHENTICATE = '/authenticate'
export const DASHBOARD = '/dashboard'
export const ACCOUNT = '/account'
export const INVITES = '/invites'
export const LISTS = '/lists'
export const LIST = '/lists/:id'
export const LIST_INVITE = '/lists/:id/invites'
export const PLACE = '/place/:id'
export const WILDCARD = '*'

// Helper function to build path with params
export function getPath(path: string, params: Record<string, string> = {}) {
  let result = path
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, value)
  }
  return result
}

// Helper function to check if route is protected
export function isProtectedRoute(pathname: string) {
  const publicRoutes = [LANDING, LOGIN, AUTHENTICATE]
  return !publicRoutes.some((route) => {
    // Convert route pattern to regex for matching
    const pattern = route.replace(/:\w+/g, '[^/]+')
    const regex = new RegExp(`^${pattern}$`)
    return regex.test(pathname)
  })
}
