import { Button } from '@hominem/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router';

interface EmptyStateProps {
  transactionCategoriesCount?: number;
  onAddCategory: () => void;
}

export function EmptyState({ transactionCategoriesCount, onAddCategory }: EmptyStateProps) {
  const navigate = useNavigate();
  return (
    <div className="text-center py-12">
      <div className="mx-auto flex items-center justify-center size-12 rounded-full bg-gray-100">
        <Plus className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900">No budget categories</h3>
      <p className="mt-1 text-sm text-gray-500">
        {transactionCategoriesCount && transactionCategoriesCount > 0
          ? `We found ${transactionCategoriesCount} categories from your transactions. Set up your budget categories to start tracking your spending.`
          : 'Get started by creating your first budget category.'}
      </p>
      <div className="mt-6 flex gap-2 justify-center">
        {transactionCategoriesCount && transactionCategoriesCount > 0 && (
          <Button onClick={() => navigate('/budget/categories/setup')} variant="outline">
            <Plus className="size-4 mr-2" />
            Set up from Transactions ({transactionCategoriesCount})
          </Button>
        )}
        <Button onClick={onAddCategory}>
          <Plus className="size-4 mr-2" />
          Create Category
        </Button>
      </div>
    </div>
  );
}
