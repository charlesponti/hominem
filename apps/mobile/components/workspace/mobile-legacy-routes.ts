import type { Href } from 'expo-router'

export function getLegacyWorkspaceRouteRedirect(route: 'start'): Href {
  if (route === 'start') {
    return '/(protected)/(tabs)/focus'
  }

  return '/(protected)/(tabs)/focus'
}
