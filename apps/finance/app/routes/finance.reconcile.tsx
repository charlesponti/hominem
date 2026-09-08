import { Alert, AlertDescription, AlertTitle } from '@ponti-studios/ui/feedback';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ponti-studios/ui/forms';
import { SectionIntro } from '@ponti-studios/ui/layout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ponti-studios/ui/primitives';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { Form, Link, data, useActionData, useNavigation, useRevalidator } from 'react-router';

import { parseTrueUpForm } from '~/lib/finance/inputs';
import {
  getLedgerBreakdown,
  getLedgerReconcileData,
  postLedgerTrueUp,
} from '~/lib/finance/ledger.server';
import { formatCurrency } from '~/lib/number.utils';
import { requireAuth } from '~/lib/require-auth.server';
import { cn } from '~/lib/utils';

import type { Route } from './+types/finance.reconcile';

const BREAKDOWN_ROW_LIMIT = 50;

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const accountId = new URL(request.url).searchParams.get('accountId')?.trim() || null;

  const [{ staleness, gates }, breakdown] = await Promise.all([
    getLedgerReconcileData(user.id),
    accountId ? getLedgerBreakdown(user.id, accountId) : Promise.resolve(null),
  ]);

  return { staleness, gates, breakdown, accountId };
}

export async function action({ request }: Route.ActionArgs) {
  const { user } = await requireAuth(request);
  const parsed = parseTrueUpForm(await request.formData());
  if (!parsed.ok) return data({ ok: false as const, error: parsed.error }, { status: 400 });

  try {
    const result = await postLedgerTrueUp({ userId: user.id, ...parsed.value });
    return { ok: true as const, result };
  } catch (error) {
    return data(
      {
        ok: false as const,
        error: error instanceof Error ? error.message : 'Reconciliation failed.',
      },
      { status: 400 },
    );
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ReconcilePage({ loaderData }: Route.ComponentProps) {
  const { staleness, gates, breakdown, accountId } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const submitting = navigation.state === 'submitting';

  const accountFieldId = useId();
  const balanceFieldId = useId();
  const dateFieldId = useId();
  const noteFieldId = useId();
  const [trueUpAccount, setTrueUpAccount] = useState('');

  useEffect(() => {
    if (actionData?.ok) revalidator.revalidate();
  }, [actionData, revalidator]);

  const accountNames = new Map(staleness.map((entry) => [entry.accountId, entry.accountName]));

  return (
    <div className="space-y-6">
      <SectionIntro
        title="Reconcile"
        description="True-up ledger balances to real readings and inspect the books for sign bugs."
      />

      {actionData && !actionData.ok ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>True-up failed</AlertTitle>
          <AlertDescription>{actionData.error}</AlertDescription>
        </Alert>
      ) : null}
      {actionData?.ok && !actionData.result.alreadyReconciled ? (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Adjustment posted</AlertTitle>
          <AlertDescription>
            {actionData.result.accountName}: ledger was{' '}
            {formatCurrency(actionData.result.ledgerSumBefore)}, posted{' '}
            {formatCurrency(actionData.result.plug)}.
            {actionData.result.warnings.map((warning) => (
              <span key={warning} className="mt-1 block">
                {warning}
              </span>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}
      {actionData?.ok && actionData.result.alreadyReconciled ? (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertTitle>Already reconciled</AlertTitle>
          <AlertDescription>
            {actionData.result.accountName} matches to the cent — nothing posted.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Reconciliation staleness</CardTitle>
          <CardDescription>
            Last reconciling entry per account, stalest first. Balances are plain ledger sums.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 font-medium">Account</th>
                <th className="pb-2 text-right font-medium">Balance</th>
                <th className="pb-2 text-right font-medium">Last reconciled</th>
                <th className="pb-2 text-right font-medium">Inspect</th>
              </tr>
            </thead>
            <tbody>
              {staleness.map((entry) => (
                <tr key={entry.accountId} className="border-t border-border">
                  <td className="py-2">
                    {entry.accountName}{' '}
                    <Badge variant="outline" className="ml-1">
                      {entry.accountType}
                    </Badge>
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatCurrency(entry.balance)}</td>
                  <td className="py-2 text-right tabular-nums">
                    {entry.lastReconciled ?? 'never'}
                  </td>
                  <td className="py-2 text-right">
                    <Link
                      to={`/finance/reconcile?accountId=${entry.accountId}`}
                      className="underline underline-offset-4"
                    >
                      Ledger
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>True-up an account</CardTitle>
          <CardDescription>
            Post a dated adjustment entry that closes the gap to a real balance reading. Uses
            money-out-negative signs: a debt owed is negative.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={accountFieldId} className="text-sm font-medium">
                Account
              </label>
              <Select
                value={trueUpAccount}
                onValueChange={(value) => setTrueUpAccount(value ?? '')}
              >
                <SelectTrigger id={accountFieldId}>
                  <SelectValue placeholder="Choose an account" />
                </SelectTrigger>
                <SelectContent>
                  {staleness.map((entry) => (
                    <SelectItem key={entry.accountId} value={entry.accountId}>
                      {entry.accountName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="accountId" value={trueUpAccount} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={balanceFieldId} className="text-sm font-medium">
                True balance
              </label>
              <Input
                id={balanceFieldId}
                name="balance"
                type="number"
                step="0.01"
                required
                placeholder="-2717.99"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={dateFieldId} className="text-sm font-medium">
                As-of date
              </label>
              <Input id={dateFieldId} name="date" type="date" defaultValue={todayIso()} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={noteFieldId} className="text-sm font-medium">
                Note
              </label>
              <Input id={noteFieldId} name="note" type="text" placeholder="Copilot reading" />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="force" className="size-4" />
              Post even if an adjustment already exists for that date
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Posting…' : 'Post adjustment'}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>

      {accountId ? (
        <Card>
          <CardHeader>
            <CardTitle>Ledger breakdown</CardTitle>
            <CardDescription>
              {breakdown
                ? `${breakdown.accountName} · ledger ${formatCurrency(breakdown.balance)} · per-description signs`
                : 'Unknown account.'}
            </CardDescription>
          </CardHeader>
          {breakdown ? (
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 text-right font-medium">n</th>
                    <th className="pb-2 text-right font-medium">+/−</th>
                    <th className="pb-2 text-right font-medium">Signed</th>
                    <th className="pb-2 text-right font-medium">Abs</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.rows.slice(0, BREAKDOWN_ROW_LIMIT).map((row) => (
                    <tr key={row.description} className="border-t border-border">
                      <td className="max-w-64 truncate py-2">{row.description || '—'}</td>
                      <td className="py-2 text-right tabular-nums">{row.count}</td>
                      <td className="py-2 text-right tabular-nums">
                        {row.positiveCount}/{row.negativeCount}
                      </td>
                      <td
                        className={cn(
                          'py-2 text-right tabular-nums',
                          row.signedSum < 0 ? 'text-destructive' : undefined,
                        )}
                      >
                        {formatCurrency(row.signedSum)}
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatCurrency(row.absSum)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {breakdown.rows.length > BREAKDOWN_ROW_LIMIT ? (
                <p className="pt-2 text-xs text-muted-foreground">
                  Showing {BREAKDOWN_ROW_LIMIT} of {breakdown.rows.length} descriptions.
                </p>
              ) : null}
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Ledger health</CardTitle>
          <CardDescription>
            {gates.totalTransactions} transactions · {gates.uncategorizedTransactions} uncategorized
            · {gates.accountsWithNoTransactions.length} empty accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={gates.orphanTransactions === 0 ? 'outline' : 'destructive'}>
              {gates.orphanTransactions} orphaned
            </Badge>
            <Badge variant={gates.duplicateGroupCount === 0 ? 'outline' : 'destructive'}>
              {gates.duplicateGroupCount} duplicate groups
            </Badge>
            <Badge variant={gates.signViolationCount === 0 ? 'outline' : 'destructive'}>
              {gates.signViolationCount} sign violations
            </Badge>
          </div>
          {gates.signViolations.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Account</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {gates.signViolations.map((entry) => (
                  <tr key={entry.transactionId} className="border-t border-border">
                    <td className="py-2">{accountNames.get(entry.accountId) ?? '—'}</td>
                    <td className="py-2">{entry.transactionType}</td>
                    <td className="py-2 text-right tabular-nums">{formatCurrency(entry.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {gates.duplicateGroups.length > 0 ? (
            <div>
              <p className="pb-1 text-sm font-medium">Duplicate candidates</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {gates.duplicateGroups.slice(0, 10).map((group, index) => (
                  <li key={`${group.accountId}-${group.postedOn}-${group.absoluteAmount}-${index}`}>
                    {group.count}× {formatCurrency(group.absoluteAmount)} ·{' '}
                    {accountNames.get(group.accountId) ?? '—'} · {group.postedOn} ·{' '}
                    {group.description || '—'}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {gates.accountsWithNoTransactions.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Empty: {gates.accountsWithNoTransactions.map((entry) => entry.accountName).join(', ')}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
