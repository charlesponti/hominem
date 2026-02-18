import { isValidGoogleHost } from '@hominem/utils/google'

export { cn } from '@hominem/ui/lib/utils'

export function buildImageUrl(src?: string | null, width = 400, height = 300) {
  if (!src) {
    return;
  }

  if (src.includes('places/') && src.includes('/photos/')) {
    // Proxy through the API so the key is never exposed to the client
    return `/api/images?resource=${encodeURIComponent(src)}&width=${width}&height=${height}`;
  }

  if (isValidGoogleHost(src) && src.includes('googleusercontent')) {
    return `${src}=w${width}-h${height}-c`;
  }

  return src;
}
