import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { env } from '~/lib/env'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function buildImageUrl(src?: string | null, width = 400, height = 300) {
  if (!src) { return }

  if (src.includes('places/') && src.includes('/photos/')) {
    return `https://places.googleapis.com/v1/${src}/media?key=${env.VITE_GOOGLE_API_KEY}&maxWidthPx=${width}&maxHeightPx=${height}`
  }

  if (src.includes('googleusercontent')) {
    return `${src}=w${width}-h${height}-c`
  }

  return src
}
