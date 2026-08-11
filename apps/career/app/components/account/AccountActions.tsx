import { LogOut, Trash2 } from 'lucide-react';

import { ActionButtonRow } from '~/components/account/ActionButtonRow';

export function AccountActions({
  isSigningOut,
  onDeleteProfile,
  onSignOut,
}: {
  isSigningOut: boolean;
  onDeleteProfile: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-3">
        <ActionButtonRow
          icon={Trash2}
          label="Delete profile"
          onClick={() => onDeleteProfile()}
          variant="outline"
          destructive
        />
        <ActionButtonRow
          icon={LogOut}
          label={isSigningOut ? 'Signing Out...' : 'Sign Out'}
          onClick={() => onSignOut()}
          variant="default"
          disabled={isSigningOut}
        />
      </div>
    </section>
  );
}
