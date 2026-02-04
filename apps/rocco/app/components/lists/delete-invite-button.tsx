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
import { useDeleteInvite } from '~/lib/hooks/use-invites';

type DeleteInviteButtonProps = {
  listId: string;
  invitedUserEmail: string;
  onDelete: (email: string) => void;
};

export default function DeleteInviteButton({
  listId,
  invitedUserEmail,
  onDelete,
}: DeleteInviteButtonProps) {
  const { isOpen, open, close } = useModal();
  const deleteInvite = useDeleteInvite();

  const handleDelete = useCallback(async () => {
    try {
      await deleteInvite.mutateAsync({ listId, invitedUserEmail });
      onDelete(invitedUserEmail);
      close();
    } catch (error) {
      console.error('Failed to delete invite:', error);
    }
  }, [deleteInvite, listId, invitedUserEmail, onDelete, close]);

  return (
    <>
      <Button
        variant="destructive"
        size="icon"
        onClick={open}
        disabled={deleteInvite.isPending}
        title="Delete invite"
      >
        <Trash2 className="size-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
        <DialogContent
          className="sm:max-w-lg"
          aria-label="Delete invite confirmation"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>Delete invite</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the invite for{' '}
              <span className="font-semibold text-foreground">{invitedUserEmail}</span>? This action
              cannot be undone.
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
              onClick={handleDelete}
              disabled={deleteInvite.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
