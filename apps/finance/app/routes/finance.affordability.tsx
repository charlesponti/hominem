import { Input } from '@ponti-studios/ui/forms';
import { Label } from '@ponti-studios/ui/primitives';
import { Badge } from '@ponti-studios/ui/primitives';
import { Button } from '@ponti-studios/ui/primitives';
import { Card, CardContent, CardHeader, CardTitle } from '@ponti-studios/ui/primitives';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { useCheckAffordability } from '~/lib/hooks/use-affordability';
import { formatCurrency } from '~/lib/number.utils';

const VERDICT_COPY = {
  affordable: { label: 'You can afford it', variant: 'default' as const, icon: CheckCircle2 },
  caution: { label: 'Proceed with caution', variant: 'secondary' as const, icon: AlertTriangle },
  'not-affordable': {
    label: "You can't afford it",
    variant: 'destructive' as const,
    icon: XCircle,
  },
};

export default function AffordabilityPage() {
  const purchaseAmountId = useId();
  const currentBalanceId = useId();
  const monthlyIncomeId = useId();
  const monthlyExpensesId = useId();
  const emergencyFundTargetId = useId();

  const [purchaseAmount, setPurchaseAmount] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [emergencyFundTarget, setEmergencyFundTarget] = useState<number | ''>('');

  const affordabilityMutation = useCheckAffordability();

  const canCheck =
    purchaseAmount > 0 && currentBalance >= 0 && monthlyIncome >= 0 && monthlyExpenses >= 0;

  const handleCheck = () => {
    if (!canCheck) return;
    affordabilityMutation.mutate({
      purchaseAmount,
      currentBalance,
      monthlyIncome,
      monthlyExpenses,
      ...(emergencyFundTarget !== '' && { emergencyFundTarget }),
    });
  };

  const result = affordabilityMutation.data;
  const verdict = useMemo(() => (result ? VERDICT_COPY[result.verdict] : null), [result]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Can I Afford This?</h1>
      <p className="text-muted-foreground">
        Enter a purchase and your current finances to get a straight answer — not just a balance
        check, but whether it protects your runway and emergency fund.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Your numbers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={purchaseAmountId}>Purchase amount ($)</Label>
              <Input
                type="number"
                id={purchaseAmountId}
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor={currentBalanceId}>Current balance ($)</Label>
              <Input
                type="number"
                id={currentBalanceId}
                value={currentBalance}
                onChange={(e) => setCurrentBalance(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor={monthlyIncomeId}>Monthly income ($)</Label>
              <Input
                type="number"
                id={monthlyIncomeId}
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor={monthlyExpensesId}>Monthly expenses ($)</Label>
              <Input
                type="number"
                id={monthlyExpensesId}
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor={emergencyFundTargetId}>
                Emergency fund target ($) <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                type="number"
                id={emergencyFundTargetId}
                placeholder="Defaults to 3x monthly expenses"
                value={emergencyFundTarget}
                onChange={(e) =>
                  setEmergencyFundTarget(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
          </div>
          <Button onClick={handleCheck} disabled={!canCheck || affordabilityMutation.isPending}>
            {affordabilityMutation.isPending ? 'Checking...' : 'Check affordability'}
          </Button>
        </CardContent>
      </Card>

      {result && verdict && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Verdict</CardTitle>
            <Badge variant={verdict.variant}>
              <verdict.icon className="size-4" />
              {verdict.label}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Balance after purchase</p>
                <p
                  className={`text-xl font-bold ${result.balanceAfterPurchase < 0 ? 'text-destructive' : 'text-foreground'}`}
                >
                  {formatCurrency(result.balanceAfterPurchase)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">% of monthly income</p>
                <p className="text-xl font-bold">
                  {result.percentOfMonthlyIncome === Number.POSITIVE_INFINITY
                    ? '∞'
                    : `${result.percentOfMonthlyIncome.toFixed(0)}%`}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Runway after purchase</p>
                <p className="text-xl font-bold">
                  {result.monthsOfRunwayAfterPurchase === Number.POSITIVE_INFINITY
                    ? '∞'
                    : `${result.monthsOfRunwayAfterPurchase.toFixed(1)} mo`}
                </p>
              </div>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {result.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
