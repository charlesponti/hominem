import { UserPlus } from 'lucide-react';

export function InvitesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted p-6 text-center md:p-12">
      <div className="mb-4 flex size-16 items-center justify-center border border-dashed border-muted">
        <UserPlus className="size-8 text-primary" />
      </div>
      <h3 className="mb-2 text-xl font-semibold text-foreground">No invitations yet</h3>
      <p className="max-w-md text-muted-foreground">
        Use the form above to invite others to collaborate on this list.
      </p>
    </div>
  );
}
