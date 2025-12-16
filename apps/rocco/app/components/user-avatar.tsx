import { Avatar, AvatarFallback, AvatarImage } from '@hominem/ui/components/ui/avatar'
import { memo, useMemo } from 'react'
import { cn } from '~/lib/utils'

interface UserAvatarProps {
  id?: string
  name?: string
  email?: string
  image?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'size-6',
  md: 'size-8',
  lg: 'size-10',
}

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

/**
 * Proxies Google user content URLs through our API to avoid CORB/CORS issues
 */
function getProxiedImageUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return undefined

  // Only proxy Google user content URLs
  if (imageUrl.includes('googleusercontent.com')) {
    // Use relative path - will be proxied through the same way as /api/trpc
    return `/api/images/proxy?url=${encodeURIComponent(imageUrl)}`
  }

  // Return other URLs as-is
  return imageUrl
}

function UserAvatar({ name, email, image, size = 'sm' }: UserAvatarProps) {
  const displayName = name || email || 'U'
  const initials = displayName.charAt(0).toUpperCase()
  const title = name || email || 'User'

  const proxiedImageUrl = useMemo(() => getProxiedImageUrl(image), [image])

  return (
    <Avatar className={cn(sizeClasses[size], 'border border-border')} title={title}>
      <AvatarImage src={proxiedImageUrl} alt={title} />
      <AvatarFallback className={textSizeClasses[size]}>{initials}</AvatarFallback>
    </Avatar>
  )
}

export default memo(UserAvatar)
