import { Badge } from '@hominem/ui/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

import { cn } from '~/lib/utils';

export function WebSocketConnectionBadge({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="fixed top-4 right-4 z-50">
      <Badge
        variant="outline"
        className={cn(
          'flex items-center gap-2',
          isConnected ? 'border-foreground text-foreground' : 'border-destructive text-destructive',
        )}
      >
        {isConnected ? (
          <>
            <Wifi size={14} className="text-foreground" aria-hidden="true" />
            <span className="text-foreground font-medium">Connected</span>
          </>
        ) : (
          <>
            <WifiOff size={14} className="text-destructive" aria-hidden="true" />
            <span className="text-destructive font-medium">Disconnected</span>
          </>
        )}
      </Badge>
    </div>
  );
}
