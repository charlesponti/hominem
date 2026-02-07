import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@hominem/ui/components/ui/alert-dialog';

import type { DisplayBudgetCategory } from './budget-category-card';

interface DeleteCategoryDialogProps {
  deletingCategory: DisplayBudgetCategory | null;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  isLoading: boolean;
}

export function DeleteCategoryDialog({
  deletingCategory,
  onOpenChange,
  onDelete,
  isLoading,
}: DeleteCategoryDialogProps) {
  return (
    <AlertDialog open={!!deletingCategory} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Category</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{deletingCategory?.name}"? This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            disabled={isLoading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
