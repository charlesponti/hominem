import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card';
import { Progress } from '@hominem/ui/components/ui/progress';
import { Target, TrendingDown, TrendingUp } from 'lucide-react';

import { formatCurrency } from '~/lib/number.utils';

interface BudgetTrackingSummaryCardsProps {
  totalAllocated: number;
  totalActual: number;
}

export function BudgetTrackingSummaryCards({
  totalAllocated,
  totalActual,
}: BudgetTrackingSummaryCardsProps) {
  const variance = totalActual - totalAllocated;
  const budgetUsagePercentage = totalAllocated > 0 ? (totalActual / totalAllocated) * 100 : 0;

  return (
    <div className="grid gap-6 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
          <Target className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(totalAllocated)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Actual Spending</CardTitle>
          {totalActual > totalAllocated ? (
            <TrendingUp className="size-4 text-destructive" />
          ) : (
            <TrendingDown className="size-4 text-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Variance</CardTitle>
          {totalActual > totalAllocated ? (
            <TrendingUp className="size-4 text-destructive" />
          ) : (
            <TrendingDown className="size-4 text-foreground" />
          )}
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${totalActual > totalAllocated ? 'text-destructive' : 'text-foreground'}`}
          >
            {totalActual > totalAllocated ? '+' : ''}
            {formatCurrency(variance)}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalActual > totalAllocated ? 'Over budget' : 'Under budget'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
          <Target className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{budgetUsagePercentage.toFixed(1)}%</div>
          <Progress value={Math.min(100, budgetUsagePercentage)} className="mt-2" />
        </CardContent>
      </Card>
    </div>
  );
}
