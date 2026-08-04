import type { ImportRequestResponse } from '@hominem/queues';
import { Button } from '@ponti-studios/ui/primitives';
import { useState } from 'react';

import type { ImportPreflightPreview } from '~/lib/hooks/use-import-transactions-store';
import { useToast } from '~/lib/hooks/use-toast';

type PreflightReviewProps = {
  preflight: ImportPreflightPreview;
  onConfirm: (input: {
    mappings: Array<{ groupKey: string; accountId?: string; createNew?: boolean }>;
    selectedRowIds: string[];
  }) => Promise<ImportRequestResponse>;
};

export function PreflightReview({ preflight, onConfirm }: PreflightReviewProps) {
  const { toast } = useToast();
  const unresolved = preflight.plan.accountGroups.filter((group) => group.unresolved);
  const [mappingValues, setMappingValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(unresolved.map((group) => [group.groupKey, 'new'])),
  );
  const [selectedRowIds, setSelectedRowIds] = useState(
    () =>
      new Set(
        preflight.plan.transactions
          .filter((transaction) => transaction.selected)
          .map((row) => row.rowId),
      ),
  );

  const candidates = preflight.plan.transactions.filter((transaction) =>
    preflight.plan.duplicateCandidateRowIds.includes(transaction.rowId),
  );

  const toggleRow = (rowId: string) => {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const confirm = async () => {
    try {
      await onConfirm({
        mappings: unresolved.map((group) => {
          const value = mappingValues[group.groupKey] ?? 'new';
          return value === 'new'
            ? { groupKey: group.groupKey, createNew: true }
            : { groupKey: group.groupKey, accountId: value };
        }),
        selectedRowIds: [...selectedRowIds],
      });
      toast({ title: 'Import queued', description: 'Your frozen import plan is running now.' });
    } catch (error) {
      toast({
        title: 'Could not queue import',
        description: error instanceof Error ? error.message : 'Try again',
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="space-y-4 border border-border p-4">
      <div>
        <h2 className="heading-4 text-foreground">Review {preflight.preflight.fileName}</h2>
        <p className="body-3 text-muted-foreground">
          {preflight.plan.stats.total} rows · {preflight.plan.stats.selected} ready · expires{' '}
          {new Date(preflight.preflight.expiresAt).toLocaleDateString()}
        </p>
      </div>

      {unresolved.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-medium">Map account groups</h3>
          {unresolved.map((group) => (
            <label className="flex items-center justify-between gap-3 text-sm" key={group.groupKey}>
              <span>
                {group.account}
                {group.accountMask ? ` ··${group.accountMask}` : ''}
              </span>
              <select
                className="border border-border bg-background px-2 py-1"
                value={mappingValues[group.groupKey] ?? 'new'}
                onChange={(event) =>
                  setMappingValues((current) => ({
                    ...current,
                    [group.groupKey]: event.target.value,
                  }))
                }
              >
                <option value="new">Create new account</option>
                {preflight.accounts.map((account) => (
                  <option value={account.id} key={account.id}>
                    {account.name}
                    {account.mask ? ` ··${account.mask}` : ''}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}

      {candidates.length > 0 ? (
        <div className="space-y-2">
          <h3 className="font-medium">Repeated-row candidates</h3>
          <p className="body-3 text-muted-foreground">
            Every row stays selected unless you untick it.
          </p>
          {candidates.map((row) => (
            <label className="flex items-center gap-3 text-sm" key={row.rowId}>
              <input
                type="checkbox"
                checked={selectedRowIds.has(row.rowId)}
                onChange={() => toggleRow(row.rowId)}
              />
              <span>
                {row.postedOn} · {row.description} · {row.amount}
              </span>
            </label>
          ))}
        </div>
      ) : null}

      <Button onClick={confirm}>Confirm import</Button>
    </section>
  );
}
