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
} from '@ponti-studios/ui/overlays';
import { Button } from '@ponti-studios/ui/primitives';
import { RotateCcwIcon, SaveIcon, Trash2Icon } from 'lucide-react';

interface EditorFormActionsProps {
  isSaving: boolean;
  isNew: boolean;
  isDirty: boolean;
  isValid: boolean;
  submitLabel: string;
  onDelete?: () => void;
  onReset?: () => void;
  deleteConfirmTitle?: string;
  deleteConfirmDescription?: string;
}

export function EditorFormActions({
  isSaving,
  isNew,
  isDirty,
  isValid,
  submitLabel,
  onDelete,
  onReset,
  deleteConfirmTitle = 'Delete this item?',
  deleteConfirmDescription = 'This action cannot be undone.',
}: EditorFormActionsProps) {
  const isSubmitDisabled = isSaving || (!isDirty && !isNew) || !isValid;

  return (
    <div className="flex gap-1">
      {!isNew && onReset ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReset}
          disabled={isSaving || !isDirty}
          title="Reset changes"
        >
          <RotateCcwIcon />
          <span className="sr-only">Reset changes</span>
        </Button>
      ) : null}

      <Button
        type="submit"
        size="icon"
        disabled={isSubmitDisabled}
        isLoading={isSaving}
        loadingLabel="Saving..."
        title={submitLabel}
      >
        <SaveIcon />
        <span className="sr-only">{submitLabel}</span>
      </Button>

      {!isNew && onDelete ? (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="destructive"
                size="icon"
                disabled={isSaving}
                title="Delete"
              >
                <Trash2Icon />
                <span className="sr-only">Delete</span>
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{deleteConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{deleteConfirmDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
