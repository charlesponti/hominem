import { Button } from '@ponti-studios/ui/primitives';
import { useEffect, useState } from 'react';

import { cn } from '~/lib/utils';

/**
 * A single, consistently-placed save affordance for forms with many
 * independently-editable fields. Sticks to the bottom of its container while
 * scrolling and stops being sticky once the container's own bottom edge is
 * reached (native `position: sticky`, no scroll listeners). Mounts with a
 * playful jiggle when changes appear and animates out once they're gone.
 */
export function SaveBar({
  dirty,
  isSaving,
  error,
  label = 'Save changes',
  savingLabel = 'Saving...',
}: {
  dirty: boolean;
  isSaving: boolean;
  error?: string | null;
  label?: string;
  savingLabel?: string;
}) {
  const [rendered, setRendered] = useState(dirty);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (dirty) {
      setExiting(false);
      setRendered(true);
    } else if (rendered) {
      setExiting(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  if (!rendered) return null;

  return (
    <div className="sticky bottom-4 z-40 flex justify-end pt-4" aria-live="polite">
      <div
        className={cn(
          'flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg',
          exiting ? 'animate-save-bar-out' : 'animate-save-bar-in',
        )}
        onAnimationEnd={() => {
          if (exiting) setRendered(false);
        }}
      >
        {error ? (
          <p className="body-3 text-destructive">{error}</p>
        ) : (
          <p className="body-3 text-muted-foreground">You have unsaved changes</p>
        )}
        <Button
          type="submit"
          size="sm"
          disabled={isSaving}
          isLoading={isSaving}
          loadingLabel={savingLabel}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}
