import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ponti-studios/ui/overlays';
import { Button } from '@ponti-studios/ui/primitives';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useSubmit } from 'react-router';

const STATUSES = ['active', 'rejected', 'withdrew', 'APPLIED', 'INTERVIEWING'];

interface QuickActionsProps {
  currentStatus: string | null;
}

export function QuickActions({ currentStatus }: QuickActionsProps) {
  const submit = useSubmit();

  const updateStatus = (status: string) => {
    submit({ intent: 'update-status', status }, { method: 'post', navigate: false });
  };

  const deleteApplication = () => {
    if (!confirm('Delete this application?')) return;
    submit({ intent: 'delete' }, { method: 'post' });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Quick actions">
          <MoreHorizontal className="size-4" />
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={8} className="w-56">
        <DropdownMenuLabel>Update status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STATUSES.filter((status) => status !== currentStatus).map((status) => (
          <DropdownMenuItem key={status} onSelect={() => updateStatus(status)}>
            {status}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={deleteApplication}>
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
