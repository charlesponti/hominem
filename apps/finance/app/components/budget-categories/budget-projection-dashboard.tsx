import { Button } from '@hominem/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card';
import { Target } from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useBudgetCategories, useCalculateBudget } from '~/lib/hooks/use-budget';
import { formatCurrency } from '~/lib/number.utils';

export function BudgetProjectionDashboard() {
  const [hasCalculated, setHasCalculated] = useState(false);

  const budgetCategories = useBudgetCategories();
  const budgetCalculateMutation = useCalculateBudget({
    onError: (error) => {
      console.error('Budget calculation error:', error.message);
    },
  });

  const categories = budgetCategories.data || [];

  // Calculate total income from categories
  const totalIncome =
    categories
      .filter((cat: any) => cat.type === 'income')
      .reduce(
        (sum: number, cat: any) =>
          sum + Number.parseFloat(String(cat.averageMonthlyExpense || '0')),
        0,
      ) || 0;

  const handleCalculate = () => {
    if (totalIncome > 0) {
      budgetCalculateMutation.mutateAsync(undefined);
      setHasCalculated(true);
    }
  };

  const handleRecalculate = () => {
    if (totalIncome > 0) {
      budgetCalculateMutation.mutateAsync(undefined);
    }
  };

  // Show loading state for budget categories
  if (budgetCategories.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full size-8 border-b-2 border-gray-900 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Loading budget data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state if no budget categories exist
  if (!budgetCategories.data || budgetCategories.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Target className="size-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Budget Categories</h3>
            <p className="text-gray-600 mb-4">
              Create budget categories to start tracking your financial goals.
            </p>
            <Button asChild>
              <a href="/budget/categories">Create Categories</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show initial state if no calculation has been made
  if (!hasCalculated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">
              Calculate your budget projections to see savings forecasts and financial summaries.
            </p>
            <Button onClick={handleCalculate} disabled={totalIncome <= 0}>
              Calculate Projections
            </Button>
            {totalIncome <= 0 && (
              <p className="text-sm text-red-600 mt-2">
                Add income categories to calculate projections
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show loading state
  if (budgetCalculateMutation.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full size-8 border-b-2 border-gray-900 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Calculating projections...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (budgetCalculateMutation.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Projections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">
              Error calculating projections: {budgetCalculateMutation.error.message}
            </p>
            <Button onClick={handleRecalculate}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show results
  if (budgetCalculateMutation.data) {
    const budgetData = budgetCalculateMutation.data;
    const projectedSurplus = budgetData.surplus ?? 0;

    const projections = budgetData.projections ?? [];
    const projectionData = projections.slice(0, 6).map((proj: any) => ({
      month: `Month ${proj.month}`,
      projected: proj.totalSaved,
      baseline: projectedSurplus * proj.month,
    }));

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Budget Projections</h3>
          <Button
            onClick={handleRecalculate}
            disabled={budgetCalculateMutation.isPending || totalIncome <= 0}
            size="sm"
          >
            {budgetCalculateMutation.isPending ? 'Calculating...' : 'Recalculate'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {/* 6-Month Savings Projection Chart */}
          <Card>
            <CardHeader>
              <CardTitle>6-Month Savings Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area
                      type="monotone"
                      dataKey="projected"
                      stroke="#8884d8"
                      fill="#8884d8"
                      name="Projected Savings"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Budget Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex justify-between">
                    <span>Monthly Income:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(budgetData.income ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Expenses:</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(budgetData.totalExpenses ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Monthly Surplus:</span>
                    <span
                      className={`font-bold ${projectedSurplus >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {formatCurrency(projectedSurplus)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Savings Rate:</span>
                    <span className="font-semibold">
                      {(budgetData.savingsRate ?? 0).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold mb-2">12-Month Outlook</h4>
                  <p className="text-sm text-muted-foreground">
                    At current rate: {formatCurrency(projectedSurplus * 12)} saved annually
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Fallback state (shouldn't reach here)
  return null;
}
