import { Button } from '@hominem/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hominem/ui/dialog';
import { Trash2 } from 'lucide-react';
import { useCallback } from 'react';

import { useModal } from '~/hooks/useModal';
import { useRemoveCollaborator } from '~/lib/hooks/use-lists';

type RemoveCollaboratorButtonProps = {
  listId: string;
  userId: string;
  userName: string;
  userEmail: string;
};

export default function RemoveCollaboratorButton({
  listId,
  userId,
  userName,
  userEmail,
}: RemoveCollaboratorButtonProps) {
  const { isOpen, open, close } = useModal();
  const removeCollaborator = useRemoveCollaborator();

  const handleRemove = useCallback(async () => {
    try {
      await removeCollaborator.mutateAsync({ listId, userId });
      close();
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
    }
  }, [removeCollaborator, listId, userId, close]);

  const displayName = userName || userEmail;

  return (
    <>
      <Button
        data-testid="remove-collaborator-button"
        variant="ghost"
        size="icon"
        onClick={open}
        disabled={removeCollaborator.isPending}
        title="Remove collaborator"
      >
        <Trash2 className="size-4 text-destructive" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
        <DialogContent
          className="sm:max-w-lg"
          aria-label="Remove collaborator confirmation"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Remove collaborator</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-semibold text-foreground">{displayName}</span> from this list?
              They will no longer have access to this list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              disabled={removeCollaborator.isPending}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
