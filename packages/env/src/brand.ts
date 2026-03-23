/**
 * Single source of truth for product brand identity.
 *
 * All platform-specific brand objects (web, mobile, desktop, API) MUST derive
 * their core identity values from this constant. Never hardcode the app name
 * or tagline elsewhere — import from here.
 */
export const BRAND = {
  appName: 'Hakumi',
  tagline: 'A notes-first personal workspace for capture, context, and chat.',
} as const

export type Brand = typeof BRAND
