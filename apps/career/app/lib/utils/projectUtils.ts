import { humanizeIdentifier } from '@hominem/utils/text';

export function getProjectStatusClasses(status: string): string {
  switch (status) {
    case 'planned':
      return 'bg-amber-100 text-amber-800';
    case 'in-progress':
      return 'border-accent/30 bg-accent/10 text-foreground';
    case 'on_hold':
    case 'archived':
      return 'bg-muted text-foreground';
    case 'completed':
      return 'border-success/30 bg-success/10 text-foreground';
    case 'cancelled':
      return 'border-destructive/30 bg-destructive/10 text-foreground';
    default:
      return 'bg-muted text-foreground';
  }
}

export const formatProjectStatus = humanizeIdentifier;
