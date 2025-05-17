import { Card } from '../card.js'

export function MessageSkeleton() {
  return (
    <Card className="p-4 bg-muted/30">
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-2.5">
          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        </div>

        {/* Tool calls skeleton */}
        <div className="space-y-2">
          <div className="h-20 bg-muted/50 rounded-md animate-pulse" />
        </div>
      </div>
    </Card>
  )
}
