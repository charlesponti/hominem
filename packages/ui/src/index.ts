import type { LinkDescriptor } from 'react-router'

export * from './components/filters'
export * from './components/layout'
export * from './components/location-select'
export * from './components/page-title'
export * from './components/ui'
export * from './hooks/use-api-client'
export * from './hooks/use-debounce'
export * from './hooks/use-filter-state'
export * from './hooks/use-media-query'
export * from './hooks/use-mobile'
export * from './hooks/use-sort'
export * from './hooks/use-url-filters'

// Common <head> link objects for all apps
export const COMMON_FONT_LINKS: LinkDescriptor[] = [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400..800;1,400..800&family=Geist+Mono:wght@100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400..800;1,400..800&family=Geist+Mono:wght@100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap',
  },
]

export const COMMON_ICON_LINKS: LinkDescriptor[] = [
  // Favicon
  { rel: 'icon', type: 'image/x-icon', href: 'icons/favicon.ico' },
  { rel: 'icon', type: 'image/png', sizes: '16x16', href: 'icons/favicon-16x16.png' },
  { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'icons/favicon-32x32.png' },
  { rel: 'icon', type: 'image/png', sizes: '96x96', href: 'icons/favicon-96x96.png' },

  // Apple Touch Icons
  { rel: 'apple-touch-icon', href: 'icons/apple-touch-icon.png' },
  { rel: 'apple-touch-icon', sizes: '57x57', href: 'icons/apple-touch-icon-57x57.png' },
  { rel: 'apple-touch-icon', sizes: '60x60', href: 'icons/apple-touch-icon-60x60.png' },
  { rel: 'apple-touch-icon', sizes: '72x72', href: 'icons/apple-touch-icon-72x72.png' },
  { rel: 'apple-touch-icon', sizes: '76x76', href: 'icons/apple-touch-icon-76x76.png' },
  { rel: 'apple-touch-icon', sizes: '114x114', href: 'icons/apple-touch-icon-114x114.png' },
  { rel: 'apple-touch-icon', sizes: '120x120', href: 'icons/apple-touch-icon-120x120.png' },
  { rel: 'apple-touch-icon', sizes: '144x144', href: 'icons/apple-touch-icon-144x144.png' },
  { rel: 'apple-touch-icon', sizes: '152x152', href: 'icons/apple-touch-icon-152x152.png' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: 'icons/apple-touch-icon-180x180.png' },

  // Android Icons
  { rel: 'icon', type: 'image/png', sizes: '36x36', href: 'icons/android-icon-36x36.png' },
  { rel: 'icon', type: 'image/png', sizes: '48x48', href: 'icons/android-icon-48x48.png' },
  { rel: 'icon', type: 'image/png', sizes: '72x72', href: 'icons/android-icon-72x72.png' },
  { rel: 'icon', type: 'image/png', sizes: '96x96', href: 'icons/android-icon-96x96.png' },
  { rel: 'icon', type: 'image/png', sizes: '144x144', href: 'icons/android-icon-144x144.png' },
  { rel: 'icon', type: 'image/png', sizes: '192x192', href: 'icons/android-icon-192x192.png' },

  // Web Manifest
  { rel: 'manifest', href: '/manifest.json' },

  // Safari Pinned Tab Icon
  { rel: 'mask-icon', href: 'icons/safari-pinned-tab.svg', color: '#ffffff' },
]
