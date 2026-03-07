import { AlertCircle } from 'lucide-react'

interface AuthErrorBannerProps {
  error?: string | null
  className?: string
}

export function AuthErrorBanner({ error, className }: AuthErrorBannerProps) {
  if (!error) return null

  return (
    <div
      className={`
        flex items-center gap-2 p-3 rounded-lg
        bg-destructive/10 border border-destructive/20
        text-destructive text-sm
        ${className ?? ''}
      `}
      role="alert"
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  )
}
