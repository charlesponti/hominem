import { Button } from '@hominem/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hominem/ui/components/ui/card';
import { ArrowLeft, Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { useTransactionCategories, useBulkCreateBudgetCategories } from '~/lib/hooks/use-budget';

interface TransactionCategory {
  name: string;
  transactionCount: number;
  averageAmount: number;
  suggestedBudget: number;
}

export default function BudgetCategoriesSetup() {
  const navigate = useNavigate();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const { data: transactionCategories, isLoading: isLoadingTransactionCategories } =
    useTransactionCategories();

  const bulkCreateMutation = useBulkCreateBudgetCategories();

  const isAllSelected = selectedCategories.size === (transactionCategories?.length || 0);

  const handleSetupFromTransactions = async () => {
    if (selectedCategories.size === 0) return;

    try {
      const categoriesToCreate = Array.from(selectedCategories).map((categoryName) => {
        const transactionCategory = transactionCategories?.find(
          (tc: any) => (tc.name || tc.category) === categoryName,
        );
        return {
          name: categoryName,
          type: 'expense' as const,
          averageMonthlyExpense: (transactionCategory?.suggestedBudget || 0).toString(),
        };
      });

      await bulkCreateMutation.mutateAsync({ categories: categoriesToCreate });

      // Navigate back to budget tracking after successful creation
      navigate('/budget/tracking');
    } catch (error) {
      console.error('Failed to create categories from transactions:', error);
    }
  };

  const toggleTransactionCategory = (categoryName: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryName)) {
      newSelected.delete(categoryName);
    } else {
      newSelected.add(categoryName);
    }
    setSelectedCategories(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedCategories(
      new Set(transactionCategories?.map((tc: any) => tc.name || tc.category) || []),
    );
  };

  const handleDeselectAll = () => {
    setSelectedCategories(new Set());
  };

  if (isLoadingTransactionCategories) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full size-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading transaction categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/budget/tracking')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="size-4" />
          Back to Tracking
        </Button>
        <div>
          <h1 className="text-3xl font-serif tracking-tight">Set up Budget Categories</h1>
          <p className="text-gray-600 mt-1">
            Select the transaction categories you'd like to convert to budget categories. We'll
            suggest budget amounts based on your spending history.
          </p>
        </div>
      </div>

      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction Categories</CardTitle>
              <CardDescription>
                {selectedCategories.size} of {transactionCategories?.length || 0} selected
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
            >
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactionCategories && transactionCategories.length > 0 ? (
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {transactionCategories.map((transactionCategory: any) => (
                <button
                  key={transactionCategory.name || transactionCategory.category}
                  className={`w-full text-left flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedCategories.has(transactionCategory.name || transactionCategory.category)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() =>
                    toggleTransactionCategory(
                      transactionCategory.name || transactionCategory.category,
                    )
                  }
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-4 rounded border-2 flex items-center justify-center ${
                        selectedCategories.has(
                          transactionCategory.name || transactionCategory.category,
                        )
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedCategories.has(
                        transactionCategory.name || transactionCategory.category,
                      ) && <Check className="size-3 text-white" />}
                    </div>
                    <div>
                      <div className="font-medium">
                        {transactionCategory.name || transactionCategory.category}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transactionCategory.transactionCount} transactions • Avg: $
                        {Math.abs(transactionCategory.averageAmount).toFixed(2)}/month
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">
                      ${(transactionCategory.suggestedBudget || 0).toFixed(0)}/month
                    </div>
                    <div className="text-xs text-gray-500">Suggested budget</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No transaction categories found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/budget/tracking')}>
          Cancel
        </Button>
        <Button
          onClick={handleSetupFromTransactions}
          disabled={selectedCategories.size === 0 || bulkCreateMutation.isPending}
          className="flex items-center gap-2"
        >
          {bulkCreateMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full size-4 border-b-2 border-white" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="size-4" />
              Create {selectedCategories.size} Categories
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
