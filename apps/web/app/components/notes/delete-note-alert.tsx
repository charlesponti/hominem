import { memo } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../alert-dialog';
import { Button } from '../button';
import { SurfacePanel } from '../surfaces/surface-panel';

interface DeleteNoteAlertProps {
  onDelete: () => Promise<void> | void;
  isDeleting?: boolean;
  isError?: boolean;
}

export const DeleteNoteAlert = memo(function DeleteNoteAlert({
  onDelete,
  isDeleting = false,
  isError = false,
}: DeleteNoteAlertProps) {
  return (
    <SurfacePanel>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="outline" className="mt-3" disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete note'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the note from your feed and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onDelete()} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Confirm delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {isError ? (
        <p className="mt-3 text-sm text-destructive">Failed to delete note. Please try again.</p>
      ) : null}
    </SurfacePanel>
  );
});
