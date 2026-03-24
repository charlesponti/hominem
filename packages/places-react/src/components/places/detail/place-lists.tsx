import { useAuthContext } from '@hominem/auth';
import { memo } from 'react';

export const PlaceLists = memo(function PlaceLists() {
  const { isAuthenticated } = useAuthContext();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div data-testid="place-lists" className="space-y-1">
      <h3 className="heading-2 font-light">Lists</h3>
      <div className="text-sm text-muted-foreground py-4">Lists loading placeholder</div>
    </div>
  );
});
