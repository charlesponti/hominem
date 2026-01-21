import { Badge } from '@hominem/ui/components/ui/badge';
import { CheckCircle } from 'lucide-react';

export function PlaidStatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
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
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
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
      return (
        <Badge variant="outline" className="text-gray-600">
          Revoked
        </Badge>
      );
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}
