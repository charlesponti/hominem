import { Badge } from '@ponti-studios/ui/primitives';
import { CheckCircle } from 'lucide-react';

export function PlaidStatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="default">
          <CheckCircle className="size-3 mr-1" />
          Active
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          <svg
            className="size-3 mr-1"
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
        <Badge variant="secondary">
          <svg
            className="size-3 mr-1"
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
      return <Badge variant="outline">Revoked</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}
