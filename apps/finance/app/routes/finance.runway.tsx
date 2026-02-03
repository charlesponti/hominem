import { Button } from '@hominem/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/card';
import { Badge } from '@hominem/ui/components/ui/badge';
import { Input } from '@hominem/ui/input';
import { Label } from '@hominem/ui/label';
import { AlertTriangle, Calendar, DollarSign, TrendingDown } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useCalculateRunway } from '~/lib/hooks/use-runway';
import { formatCurrency } from '~/lib/number.utils';

interface PlannedPurchase {
  description: string;
  amount: number;
  date: string;
}

export default function RunwayPage() {
  const initialBalanceId = useId();
  const monthlyExpensesId = useId();
  const descriptionId = useId();
  const amountId = useId();
  const dateId = useId();

  const [initialBalance, setInitialBalance] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [plannedPurchases, setPlannedPurchases] = useState<PlannedPurchase[]>([]);
  const [newPurchase, setNewPurchase] = useState<PlannedPurchase>({
    description: '',
    amount: 0,
    date: '',
  });

  const runwayMutation = useCalculateRunway();

  const chartData = useMemo(() => {
    const response = runwayMutation.data;
    if (!response?.projectionData) {
      return [];
    }
    return response.projectionData;
  }, [runwayMutation.data]);

  // Calculate runway metrics from RPC response
  const runwayMetrics = useMemo(() => {
    const response = runwayMutation.data;
    if (!response) {
      return {
        monthsUntilZero: 0,
        zeroDate: new Date(),
        minimumBalance: 0,
        isRunwayDangerous: false,
        totalPlannedExpenses: 0,
      };
    }

    const data = response;
    if (!data)
      return {
        monthsUntilZero: 0,
        zeroDate: new Date(),
        minimumBalance: 0,
        isRunwayDangerous: false,
        totalPlannedExpenses: 0,
      };
    const zeroDate = new Date(data.runwayEndDate);
    const minimumBalance = Math.min(...chartData.map((d: { balance: number }) => d.balance));

    return {
      monthsUntilZero: data.runwayMonths,
      zeroDate,
      minimumBalance,
      isRunwayDangerous: data.isRunwayDangerous,
      totalPlannedExpenses: data.totalPlannedExpenses,
    };
  }, [runwayMutation.data, chartData]);

  const handleAddPurchase = () => {
    if (newPurchase.description && newPurchase.amount > 0 && newPurchase.date) {
      const updatedPurchases = [...plannedPurchases, newPurchase];
      setPlannedPurchases(updatedPurchases);
      setNewPurchase({ description: '', amount: 0, date: '' });

      // Recalculate if we have the required values
      if (initialBalance > 0 && monthlyExpenses > 0) {
        runwayMutation.mutate({
          balance: initialBalance,
          monthlyExpenses,
          plannedPurchases: updatedPurchases,
        });
      }
    }
  };

  const handleRemovePurchase = (index: number) => {
    const updatedPurchases = plannedPurchases.filter((_, i) => i !== index);
    setPlannedPurchases(updatedPurchases);

    // Recalculate if we have the required values
    if (initialBalance > 0 && monthlyExpenses > 0) {
      runwayMutation.mutate({
        balance: initialBalance,
        monthlyExpenses,
        plannedPurchases: updatedPurchases,
      });
    }
  };

  const handleCalculateRunway = () => {
    if (initialBalance > 0 && monthlyExpenses > 0) {
      runwayMutation.mutate({
        balance: initialBalance,
        monthlyExpenses,
        plannedPurchases,
      });
    }
  };

  // Auto-calculate when values change
  const handleInputChange = (field: 'initialBalance' | 'monthlyExpenses', value: number) => {
    if (field === 'initialBalance') {
      setInitialBalance(value);
    } else {
      setMonthlyExpenses(value);
    }

    // Auto-calculate if both values are set
    const newBalance = field === 'initialBalance' ? value : initialBalance;
    const newMonthlyExpenses = field === 'monthlyExpenses' ? value : monthlyExpenses;

    if (newBalance > 0 && newMonthlyExpenses > 0) {
      runwayMutation.mutate({
        balance: newBalance,
        monthlyExpenses: newMonthlyExpenses,
        plannedPurchases,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Financial Runway Calculator</h1>
        {runwayMetrics.isRunwayDangerous && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="size-4" />
            Short Runway
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      {chartData.length > 0 && (
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
              <DollarSign className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(initialBalance)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Burn Rate</CardTitle>
              <TrendingDown className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(monthlyExpenses)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Runway (Months)</CardTitle>
              <Calendar className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${runwayMetrics.isRunwayDangerous ? 'text-red-600' : 'text-green-600'}`}
              >
                {runwayMetrics.monthsUntilZero === Number.POSITIVE_INFINITY
                  ? '∞'
                  : runwayMetrics.monthsUntilZero}
              </div>
              {runwayMetrics.monthsUntilZero !== Number.POSITIVE_INFINITY && (
                <p className="text-xs text-muted-foreground">
                  Until {runwayMetrics.zeroDate.toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Minimum Balance</CardTitle>
              <TrendingDown className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${runwayMetrics.minimumBalance < 0 ? 'text-red-600' : 'text-blue-600'}`}
              >
                {formatCurrency(runwayMetrics.minimumBalance)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Input Form */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Financial Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor={initialBalanceId}>Initial Balance ($)</Label>
              <Input
                type="number"
                id={initialBalanceId}
                value={initialBalance}
                onChange={(e) => handleInputChange('initialBalance', Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor={monthlyExpensesId}>Monthly Expenses ($)</Label>
              <Input
                type="number"
                id={monthlyExpensesId}
                value={monthlyExpenses}
                onChange={(e) => handleInputChange('monthlyExpenses', Number(e.target.value))}
              />
            </div>
            <Button
              onClick={handleCalculateRunway}
              disabled={initialBalance <= 0 || monthlyExpenses <= 0 || runwayMutation.isPending}
              className="w-full"
            >
              {runwayMutation.isPending ? 'Calculating...' : 'Calculate Runway'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Planned Purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor={descriptionId}>Description</Label>
                <Input
                  id={descriptionId}
                  placeholder="e.g., New laptop"
                  value={newPurchase.description}
                  onChange={(e) => setNewPurchase({ ...newPurchase, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={amountId}>Amount ($)</Label>
                  <Input
                    type="number"
                    id={amountId}
                    placeholder="0"
                    value={newPurchase.amount}
                    onChange={(e) =>
                      setNewPurchase({ ...newPurchase, amount: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={dateId}>Date</Label>
                  <Input
                    type="date"
                    id={dateId}
                    value={newPurchase.date}
                    onChange={(e) => setNewPurchase({ ...newPurchase, date: e.target.value })}
                  />
                </div>
              </div>
              <Button
                onClick={handleAddPurchase}
                className="w-full"
                disabled={!newPurchase.description || newPurchase.amount <= 0 || !newPurchase.date}
              >
                Add Purchase
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planned Purchases List */}
      {plannedPurchases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Planned Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plannedPurchases.map((purchase, index) => (
                <div
                  key={`${purchase.description}-${purchase.date}-${index}`}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium">{purchase.description}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      on {new Date(purchase.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(purchase.amount)}</span>
                    <Button variant="outline" size="sm" onClick={() => handleRemovePurchase(index)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Planned Expenses:</span>
                  <span>{formatCurrency(runwayMetrics.totalPlannedExpenses)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>12-Month Runway Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-100">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), 'Projected Balance']}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                    }}
                  />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="2 2" />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      const isNegative = payload?.balance < 0;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={isNegative ? '#ef4444' : '#10b981'}
                          stroke={isNegative ? '#ef4444' : '#10b981'}
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
