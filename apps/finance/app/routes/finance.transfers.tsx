import { Input } from '@ponti-studios/ui/forms';
import { SectionIntro } from '@ponti-studios/ui/layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ponti-studios/ui/primitives';
import { Button } from '@ponti-studios/ui/primitives';
import { ArrowRight } from 'lucide-react';
import { useId } from 'react';
import { Form } from 'react-router';

import { parseTransfersParams } from '~/lib/finance/inputs';
import { getLedgerTransferPairs } from '~/lib/finance/ledger.server';
import { formatCurrency } from '~/lib/number.utils';
import { requireAuth } from '~/lib/require-auth.server';

import type { Route } from './+types/finance.transfers';

export async function loader({ request }: Route.LoaderArgs) {
  const { user } = await requireAuth(request);
  const filters = parseTransfersParams(new URL(request.url).searchParams);
  const pairs = await getLedgerTransferPairs(user.id, filters);
  return { pairs, filters };
}

export default function TransfersPage({ loaderData }: Route.ComponentProps) {
  const { pairs, filters } = loaderData;
  const windowId = useId();
  const minId = useId();
  const limitId = useId();

  return (
    <div className="space-y-6">
      <SectionIntro
        title="Transfer pairs"
        description="Same-amount entries on two accounts a few days apart are usually one real transfer recorded twice — not duplicates. Verify each leg before touching either side."
      />

      <Card>
        <CardHeader>
          <CardTitle>Detection filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Form method="get" className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label htmlFor={windowId} className="text-sm font-medium">
                Window (days)
              </label>
              <Input
                id={windowId}
                name="windowDays"
                type="number"
                min={0}
                max={30}
                defaultValue={filters.windowDays}
                className="w-28"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={minId} className="text-sm font-medium">
                Min amount
              </label>
              <Input
                id={minId}
                name="minAmount"
                type="number"
                min={0}
                step="0.01"
                defaultValue={filters.minAmount}
                className="w-32"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor={limitId} className="text-sm font-medium">
                Max pairs
              </label>
              <Input
                id={limitId}
                name="limit"
                type="number"
                min={1}
                max={500}
                defaultValue={filters.limit}
                className="w-28"
              />
            </div>
            <Button type="submit">Apply</Button>
          </Form>
        </CardContent>
      </Card>

      {pairs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No candidate pairs at these filters — try a wider window or a lower minimum.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {pairs.length} candidate pair{pairs.length === 1 ? '' : 's'}, largest first.
          </p>
          {pairs.map((pair) => (
            <Card key={`${pair.first.transactionId}-${pair.second.transactionId}`}>
              <CardHeader>
                <CardTitle>{formatCurrency(pair.absoluteAmount)}</CardTitle>
                <CardDescription>
                  {pair.first.postedOn} → {pair.second.postedOn}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  { leg: pair.first, label: 'First leg' },
                  { leg: pair.second, label: 'Second leg' },
                ].map(({ leg, label }) => (
                  <div
                    key={leg.transactionId}
                    className="flex items-center justify-between gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <p className="font-medium">{leg.accountName}</p>
                      <p className="text-muted-foreground">
                        {leg.description || '—'} · {leg.postedOn}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <ArrowRight className="size-4 text-muted-foreground" />
                      <span>{formatCurrency(leg.amount)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
