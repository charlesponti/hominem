import { CHART_COLORS } from '@hominem/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card';
import { Label } from '@hominem/ui/components/ui/label';
import { LoadingSpinner } from '@hominem/ui/components/ui/loading-spinner';
import { RadioGroup, RadioGroupItem } from '@hominem/ui/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select';
import { Input } from '@hominem/ui/input';
import { AlertTriangle, BarChart3, Calendar, TrendingUp } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useMonthlyStats } from '~/lib/hooks/use-monthly-stats';
import { useTimeSeriesData } from '~/lib/hooks/use-time-series';
import { formatCurrency } from '~/lib/number.utils';

const BudgetImpactCalculator = () => {
  const oneTimeId = useId();
  const recurringId = useId();

  // Get current month for data
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

  // Get historical spending data (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const {
    chartData: historicalData,
    isLoading: isLoadingHistorical,
    error: historicalError,
  } = useTimeSeriesData({
    dateFrom: sixMonthsAgo,
    dateTo: new Date(),
    groupBy: 'month',
    enabled: true,
  });

  // Get current month stats
  const {
    stats: currentMonthStats,
    isLoading: isLoadingCurrent,
    error: currentError,
  } = useMonthlyStats(currentMonth);

  // State for purchase inputs
  const [purchaseType, setPurchaseType] = useState('one-time');
  const [amount, setAmount] = useState(500);
  const [frequency, setFrequency] = useState('monthly');
  const [customValue, setCustomValue] = useState(1);
  const [customUnit, setCustomUnit] = useState('days');

  // Calculate real financial metrics from historical data
  const financialMetrics = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return {
        averageMonthlyIncome: 0,
        averageMonthlyExpenses: 0,
        averageMonthlySavings: 0,
        averageSavingsRate: 0,
        spendingVolatility: 0,
        hasEnoughData: false,
      };
    }

    const validMonths = historicalData.filter(
      (month) => (month.Spending || 0) > 0 || (month.Income || 0) > 0,
    );

    if (validMonths.length === 0) {
      return {
        averageMonthlyIncome: 0,
        averageMonthlyExpenses: 0,
        averageMonthlySavings: 0,
        averageSavingsRate: 0,
        spendingVolatility: 0,
        hasEnoughData: false,
      };
    }

    const totalIncome = validMonths.reduce((sum, month) => sum + (month.Income || 0), 0);
    const totalExpenses = validMonths.reduce((sum, month) => sum + (month.Spending || 0), 0);
    const totalSavings = totalIncome - totalExpenses;

    const averageMonthlyIncome = totalIncome / validMonths.length;
    const averageMonthlyExpenses = totalExpenses / validMonths.length;
    const averageMonthlySavings = totalSavings / validMonths.length;
    const averageSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

    // Calculate spending volatility (standard deviation)
    const spendingValues = validMonths.map((month) => month.Spending || 0);
    const meanSpending = averageMonthlyExpenses;
    const variance =
      spendingValues.reduce((sum, value) => sum + (value - meanSpending) ** 2, 0) /
      spendingValues.length;
    const spendingVolatility = Math.sqrt(variance);

    return {
      averageMonthlyIncome,
      averageMonthlyExpenses,
      averageMonthlySavings,
      averageSavingsRate,
      spendingVolatility,
      hasEnoughData: validMonths.length >= 2,
      dataMonths: validMonths.length,
    };
  }, [historicalData]);

  // Calculate monthly cost based on frequency
  const calculateMonthlyRate = () => {
    if (purchaseType === 'one-time') return amount / 12;

    switch (frequency) {
      case 'weekly':
        return (amount * 52) / 12;
      case 'monthly':
        return amount;
      case 'quarterly':
        return amount / 3;
      case 'annually':
        return amount / 12;
      case 'custom':
        switch (customUnit) {
          case 'days':
            return (amount * (365 / customValue)) / 12;
          case 'weeks':
            return (amount * (52 / customValue)) / 12;
          case 'months':
            return amount / customValue;
          case 'years':
            return amount / (12 * customValue);
          default:
            return amount;
        }
      default:
        return amount;
    }
  };

  // Calculate impact over next 12 months using real data
  const calculateImpact = () => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const monthlyImpact = calculateMonthlyRate();

    // Use real average savings rate, but be conservative
    const conservativeSavingsRate = Math.max(0, financialMetrics.averageSavingsRate - 5); // 5% buffer
    const baselineMonthlySavings =
      financialMetrics.averageMonthlyIncome * (conservativeSavingsRate / 100);

    // Start with current savings if available
    const startingSavings = currentMonthStats?.netIncome || 0;

    return months.map((month) => {
      const baselineSavings = startingSavings + baselineMonthlySavings * month;
      const impactedSavings = baselineSavings - monthlyImpact * month;

      return {
        month: `Month ${month}`,
        baseline: Math.round(baselineSavings),
        withPurchase: Math.round(impactedSavings),
      };
    });
  };

  const impactData = calculateImpact();
  const monthlyImpact = calculateMonthlyRate();
  const newSavingsRate =
    financialMetrics.averageMonthlyIncome > 0
      ? ((financialMetrics.averageMonthlySavings - monthlyImpact) /
          financialMetrics.averageMonthlyIncome) *
        100
      : 0;

  const formatFrequencyDisplay = () => {
    if (frequency !== 'custom') return frequency;
    return `Every ${customValue} ${customUnit}`;
  };

  // Calculate actionable insights
  const insights = useMemo(() => {
    if (!financialMetrics.hasEnoughData) return [];

    const insights = [];

    // Check if this would significantly impact savings
    if (monthlyImpact > financialMetrics.averageMonthlySavings * 0.5) {
      insights.push({
        type: 'warning',
        message: `This purchase would use ${((monthlyImpact / financialMetrics.averageMonthlySavings) * 100).toFixed(0)}% of your average monthly savings`,
      });
    }

    // Check if this would put savings rate below 10%
    if (newSavingsRate < 10 && newSavingsRate > 0) {
      insights.push({
        type: 'warning',
        message: 'This would reduce your savings rate below the recommended 10%',
      });
    }

    // Check if this would create negative savings
    if (newSavingsRate < 0) {
      insights.push({
        type: 'danger',
        message: 'This purchase would exceed your income and create debt',
      });
    }

    // Suggest alternatives based on spending patterns
    if (monthlyImpact > 0) {
      const equivalentReduction = (monthlyImpact / financialMetrics.averageMonthlyExpenses) * 100;
      insights.push({
        type: 'info',
        message: `To afford this, you'd need to reduce other spending by ${equivalentReduction.toFixed(1)}%`,
      });
    }

    return insights;
  }, [financialMetrics, monthlyImpact, newSavingsRate]);

  if (isLoadingHistorical || isLoadingCurrent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="md" className="mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  if (historicalError || currentError) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Data</h3>
        <p className="text-muted-foreground mb-4">
          {historicalError?.message || currentError || 'Unable to load your financial data'}
        </p>
        <p className="text-sm text-muted-foreground">Import transactions to use this calculator.</p>
      </div>
    );
  }

  if (!financialMetrics.hasEnoughData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-foreground mb-2">Not Enough Data</h3>
        <p className="text-muted-foreground mb-4">
          We need at least 2 months of transaction data to provide accurate impact analysis.
        </p>
        <p className="text-sm text-muted-foreground">
          You currently have {financialMetrics.dataMonths} month
          {financialMetrics.dataMonths !== 1 ? 's' : ''} of data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Purchase Impact Calculator</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-4" />
          Based on {financialMetrics.dataMonths} months of data
        </div>
      </div>

      {/* Real Financial Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            Your Financial Reality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Average Monthly Income</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(financialMetrics.averageMonthlyIncome)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Average Monthly Expenses</p>
              <p className="text-lg font-semibold text-destructive">
                {formatCurrency(financialMetrics.averageMonthlyExpenses)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Average Monthly Savings</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(financialMetrics.averageMonthlySavings)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Average Savings Rate</p>
              <p className="text-lg font-semibold">
                {financialMetrics.averageSavingsRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Purchase Impact Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Purchase Type</Label>
                <RadioGroup value={purchaseType} onValueChange={setPurchaseType} className="mt-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="one-time" id={oneTimeId} />
                    <Label htmlFor={oneTimeId}>One-time Purchase</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recurring" id={recurringId} />
                    <Label htmlFor={recurringId}>Recurring Subscription</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              {purchaseType === 'recurring' && (
                <div className="space-y-4">
                  <div>
                    <Label>Frequency</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger>
                        <SelectValue>{formatFrequencyDisplay()}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {frequency === 'custom' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Every</Label>
                        <Input
                          type="number"
                          min="1"
                          value={customValue}
                          onChange={(e) => setCustomValue(Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Select value={customUnit} onValueChange={setCustomUnit}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">Days</SelectItem>
                            <SelectItem value="weeks">Weeks</SelectItem>
                            <SelectItem value="months">Months</SelectItem>
                            <SelectItem value="years">Years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="size-4" />
                  Impact Summary
                </h3>
                <div className="space-y-1 text-sm">
                  <p>
                    Monthly Cost:{' '}
                    <span className="font-semibold">{formatCurrency(monthlyImpact)}</span>
                  </p>
                  <p>
                    Current Savings Rate:{' '}
                    <span className="font-semibold">
                      {financialMetrics.averageSavingsRate.toFixed(1)}%
                    </span>
                  </p>
                  <p>
                    New Savings Rate:{' '}
                    <span
                      className={`font-semibold ${newSavingsRate >= 0 ? 'text-foreground' : 'text-destructive'}`}
                    >
                      {newSavingsRate.toFixed(1)}%
                    </span>
                  </p>
                  <p>
                    12-Month Impact:{' '}
                    <span className="font-semibold">{formatCurrency(monthlyImpact * 12)}</span>
                  </p>
                  {purchaseType === 'recurring' && (
                    <p>
                      Payment Schedule:{' '}
                      <span className="font-semibold">{formatFrequencyDisplay()}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Actionable Insights */}
              {insights.length > 0 && (
                <div className="space-y-2">
                  {insights.map((insight) => (
                    <div
                      key={`${insight.type}-${insight.message}`}
                      className={`p-3 border ${
                        insight.type === 'danger'
                          ? 'bg-destructive/10 border-destructive/50 text-destructive'
                          : insight.type === 'warning'
                            ? 'bg-warning-subtle border-warning-subtle text-warning'
                            : 'bg-muted border-border text-foreground'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="size-4" />
                        <span className="text-sm font-medium">{insight.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={impactData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area
                  type="monotone"
                  dataKey="baseline"
                  stroke={CHART_COLORS.chart2}
                  fill={CHART_COLORS.chart2}
                  name="Without Purchase"
                />
                <Area
                  type="monotone"
                  dataKey="withPurchase"
                  stroke={CHART_COLORS.positive}
                  fill={CHART_COLORS.positive}
                  name="With Purchase"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetImpactCalculator;
