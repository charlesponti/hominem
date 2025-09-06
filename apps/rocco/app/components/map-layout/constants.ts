import type { PlaceLocation } from '~/lib/types'

export const ZOOM_LEVELS = {
  DEFAULT: 15,
  CLOSE: 18,
  CITY: 12,
} as const

export const DEFAULT_CENTER: PlaceLocation = {
  latitude: 40.7831, // New York City
  longitude: -73.9712,
}

export const MAX_PHOTOS = 5

// Tailwind CSS breakpoints for reference
export const BREAKPOINTS = {
  sm: '640px', // Small devices (phones)
  md: '768px', // Medium devices (tablets)
  lg: '1024px', // Large devices (laptops)
  xl: '1280px', // Extra large devices (desktops)
  '2xl': '1536px', // 2X large devices (large desktops)
} as const
