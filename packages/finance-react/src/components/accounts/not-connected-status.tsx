import { Badge } from '@hominem/ui/components/ui/badge'
import { AlertCircleIcon } from 'lucide-react'

export function NotConnectedStatus() {
  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="text-muted-foreground">
        <AlertCircleIcon className="size-3 mr-1" />
        Not Connected
      </Badge>
    </div>
  )
}
