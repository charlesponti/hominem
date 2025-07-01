import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Button } from '~/components/ui/button'
import { DateMonthSelect } from '~/components/ui/date-month-select'
import { trpc } from '~/lib/trpc'

interface BudgetTrackingHeaderProps {
  selectedMonthYear: string
  onMonthChange: (value: string) => void
}

export function BudgetTrackingHeader({
  selectedMonthYear,
  onMonthChange,
}: BudgetTrackingHeaderProps) {
  const navigate = useNavigate()

  const { data: transactionCategories } = trpc.finance.budget.transactionCategories.useQuery()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-serif tracking-tight">Budget Tracking</h1>
      </div>
      <div className="flex items-center gap-2">
        <DateMonthSelect selectedMonthYear={selectedMonthYear} onMonthChange={onMonthChange} />
        {transactionCategories && transactionCategories.length > 0 && (
          <Button
            variant="outline"
            onClick={() => navigate('/budget/categories/setup')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Setup from Transactions ({transactionCategories.length})
          </Button>
        )}
        <Button
          onClick={() => navigate('/budget/categories/new')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>
    </div>
  )
}
