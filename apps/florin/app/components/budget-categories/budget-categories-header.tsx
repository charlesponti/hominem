import { Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'

interface BudgetCategoriesHeaderProps {
  transactionCategoriesCount?: number
  onAddCategory: () => void
  onSetupFromTransactions: () => void
}

export function BudgetCategoriesHeader({
  // transactionCategoriesCount,
  onAddCategory,
  // onSetupFromTransactions,
}: BudgetCategoriesHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-serif tracking-tighter text-gray-900">Budget Categories</h1>
      </div>
      <div className="flex gap-2">
        {/* {transactionCategoriesCount && transactionCategoriesCount > 0 && (
          <Button
            onClick={onSetupFromTransactions}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add from Transactions
          </Button>
        )} */}
        <Button onClick={onAddCategory} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>
    </div>
  )
}
