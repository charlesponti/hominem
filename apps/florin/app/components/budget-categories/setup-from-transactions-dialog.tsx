import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

export interface TransactionCategory {
  name: string
  transactionCount: number
  totalAmount: number
  averageAmount: number
  suggestedBudget: number
}

interface SetupFromTransactionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionCategories: TransactionCategory[] | undefined
  isLoading: boolean
  selectedCategories: Set<string>
  onToggleCategory: (categoryName: string) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onSubmit: () => void
  onCancel: () => void
  isSubmitting: boolean
}

export function SetupFromTransactionsDialog({
  open,
  onOpenChange,
  transactionCategories,
  isLoading,
  selectedCategories,
  onToggleCategory,
  onSelectAll,
  onDeselectAll,
  onSubmit,
  onCancel,
  isSubmitting,
}: SetupFromTransactionsDialogProps) {
  const isAllSelected = selectedCategories.size === (transactionCategories?.length || 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set up Budget Categories from Transactions</DialogTitle>
          <DialogDescription>
            Select the transaction categories you'd like to convert to budget categories. We'll
            suggest budget amounts based on your spending history.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            <span className="ml-2">Loading transaction categories...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {selectedCategories.size} of {transactionCategories?.length || 0} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={isAllSelected ? onDeselectAll : onSelectAll}
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {transactionCategories?.map((transactionCategory) => (
                <button
                  key={transactionCategory.name}
                  className={`w-full text-left flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCategories.has(transactionCategory.name)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onToggleCategory(transactionCategory.name)}
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(transactionCategory.name)}
                      onChange={() => onToggleCategory(transactionCategory.name)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <div>
                      <div className="font-medium">{transactionCategory.name}</div>
                      <div className="text-sm text-gray-500">
                        {transactionCategory.transactionCount} transactions • Avg: $
                        {Math.abs(transactionCategory.averageAmount).toFixed(2)}/month
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">
                      ${transactionCategory.suggestedBudget.toFixed(0)}/month
                    </div>
                    <div className="text-xs text-gray-500">Suggested budget</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={selectedCategories.size === 0 || isSubmitting}>
            {isSubmitting ? 'Creating...' : `Create ${selectedCategories.size} Categories`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
