import { UserPlus } from 'lucide-react';

export default function InvitesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted p-6 md:p-12 text-center">
      <div className="w-16 h-16 border border-dashed border-muted flex items-center justify-center mb-4">
        <UserPlus className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">No invitations yet</h3>
      <p className="text-muted-foreground max-w-md">
        Use the form above to invite others to collaborate on this list.
      </p>
    </div>
  );
}
