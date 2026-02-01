import { Button } from '@hominem/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router';

import { DateMonthSelect } from '~/components/date-month-select';
import { useTransactionCategories } from '~/lib/hooks/use-budget';

interface BudgetTrackingHeaderProps {
  selectedMonthYear: string;
  onMonthChange: (value: string) => void;
}

export function BudgetTrackingHeader({
  selectedMonthYear,
  onMonthChange,
}: BudgetTrackingHeaderProps) {
  const navigate = useNavigate();

  const { data: categories } = useTransactionCategories();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-serif tracking-tight">Budget Tracking</h1>
      </div>
      <div className="flex items-center gap-2">
        <DateMonthSelect selectedMonthYear={selectedMonthYear} onMonthChange={onMonthChange} />
        {categories && categories.length > 0 && (
          <Button
            variant="outline"
            onClick={() => navigate('/budget/categories/setup')}
            className="flex items-center gap-2"
          >
            <Plus className="size-4" />
            Setup from Transactions ({categories.length})
          </Button>
        )}
        <Button
          onClick={() => navigate('/budget/categories/new')}
          className="flex items-center gap-2"
        >
          <Plus className="size-4" />
          Add Category
        </Button>
      </div>
    </div>
  );
}
