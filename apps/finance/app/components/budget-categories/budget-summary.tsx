import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card';

interface BudgetSummaryProps {
  totalBudget: number;
  totalSpent: number;
}

export function BudgetSummary({ totalBudget, totalSpent }: BudgetSummaryProps) {
  const remaining = totalBudget - totalSpent;
  const spentPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Determine the color based on spending percentage using VOID design tokens
  const getProgressColor = () => {
    if (spentPercentage > 100) return 'hsl(0 100% 50%)'; // var(--destructive)
    if (spentPercentage > 80) return 'hsl(30 100% 50%)'; // var(--warning)
    return 'var(--color-emphasis-high)'; // foreground white
  };

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2">
        <CardTitle className="text-base font-medium text-foreground">Budget Summary</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-base font-bold text-foreground">${totalSpent.toLocaleString()}</div>
          <span
            className={`text-xs font-medium ${remaining >= 0 ? 'text-foreground' : 'text-destructive'}`}
          >
            {remaining >= 0 ? '+' : ''}${remaining.toLocaleString()} remaining
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full border border-foreground h-1.5">
          <div
            className="h-1.5"
            style={{
              width: `${Math.min(spentPercentage, 100)}%`,
              backgroundColor: getProgressColor(),
            }}
          />
        </div>

        {/* Budget total */}
        <div className="mt-1 text-xs text-muted-foreground">
          of ${totalBudget.toLocaleString()} total budget
        </div>
      </CardContent>
    </Card>
  );
}
