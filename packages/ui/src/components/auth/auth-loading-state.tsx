import { Loader2 } from 'lucide-react'

interface AuthLoadingStateProps {
  message?: string
  className?: string
}

export function AuthLoadingState({
  message = 'Loading...',
  className,
}: AuthLoadingStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-3 p-6
        text-muted-foreground
        ${className ?? ''}
      `}
    >
      <Loader2 className="w-6 h-6 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  )
}
