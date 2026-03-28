import { CheckCircle } from 'lucide-react';

import { Badge } from '../ui/badge';

export type PlaidStatus = 'active' | 'error' | 'pending_expiration' | 'revoked' | null;

interface PlaidStatusBadgeProps {
  status: PlaidStatus;
}

export function PlaidStatusBadge({ status }: PlaidStatusBadgeProps) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="default" className="border-border bg-muted text-foreground">
          <CheckCircle className="mr-1 size-3" />
          Active
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          <svg
            className="mr-1 size-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="Error icon"
          >
            <title>Error</title>
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          Error
        </Badge>
      );
    case 'pending_expiration':
      return (
        <Badge variant="secondary" className="border-warning-subtle bg-warning-subtle text-warning">
          <svg
            className="mr-1 size-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="Clock icon"
          >
            <title>Pending Expiration</title>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Expiring Soon
        </Badge>
      );
    case 'revoked':
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Revoked
        </Badge>
      );
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}
