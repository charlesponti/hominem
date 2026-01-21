import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card';

interface BudgetSummaryProps {
  totalBudget: number;
  totalSpent: number;
}

export function BudgetSummary({ totalBudget, totalSpent }: BudgetSummaryProps) {
  const remaining = totalBudget - totalSpent;
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Determine the color based on spending percentage
  const getProgressColor = () => {
    if (spentPercentage > 100) return '#ef4444'; // red-500
    if (spentPercentage > 80) return '#f59e0b'; // amber-500
    return '#10b981'; // emerald-500
  };

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-base font-medium text-gray-900">Budget Summary</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-base font-bold text-gray-900">${totalSpent.toLocaleString()}</div>
          <span
            className={`text-xs font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {remaining >= 0 ? '+' : ''}${remaining.toLocaleString()} remaining
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-300 ease-in-out"
            style={{
              width: `${Math.min(spentPercentage, 100)}%`,
              backgroundColor: getProgressColor(),
            }}
          />
        </div>

        {/* Budget total */}
        <div className="mt-1 text-xs text-gray-500">
          of ${totalBudget.toLocaleString()} total budget
        </div>
      </CardContent>
    </Card>
  );
}
