import type { UsageFeatureBreakdown, UsageModelBreakdown } from '@hominem/rpc/types';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '~/components/ui/button';
import { useUsageReport } from '~/hooks/use-usage';

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const numberFormatter = new Intl.NumberFormat('en-US');
const periodFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const featureLabels: Record<string, string> = {
  chat_stream: 'Chat',
  text_enhance: 'Text enhancement',
  note_generate: 'Note generation',
  task_extract: 'Task extraction',
  voice_task_extract: 'Voice task extraction',
  time_block_extract: 'Time block extraction',
  voice_cleanup: 'Voice cleanup',
  chat_speech: 'Chat speech',
  embedding: 'Embeddings',
  mcp_tool_call: 'MCP tool calls',
  career_resume_convert: 'Resume conversion',
  career_resume_customize: 'Resume customization',
  career_job_scrape: 'Job scraping',
  career_skills_derive: 'Skill derivation',
  file_image_analyze: 'Image analysis',
  file_document_summarize: 'Document summarization',
};

function formatUsd(value: number) {
  return usdFormatter.format(value);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatFeature(feature: string) {
  return featureLabels[feature] ?? feature.replaceAll('_', ' ');
}

function UsageTable({
  rows,
  kind,
}: {
  rows: UsageFeatureBreakdown[] | UsageModelBreakdown[];
  kind: 'feature' | 'model';
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">{kind === 'feature' ? 'Feature' : 'Model'}</th>
            <th className="px-3 py-2 text-right font-medium">Requests</th>
            <th className="px-3 py-2 text-right font-medium">Input tokens</th>
            <th className="px-3 py-2 text-right font-medium">Output tokens</th>
            <th className="px-3 py-2 text-right font-medium">Total tokens</th>
            <th className="px-3 py-2 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const featureRow = row as UsageFeatureBreakdown;
            const modelRow = row as UsageModelBreakdown;
            const label =
              kind === 'feature'
                ? formatFeature(featureRow.feature)
                : (modelRow.model ?? 'Unknown model');
            const rowKey = kind === 'feature' ? featureRow.feature : (modelRow.model ?? 'unknown');
            return (
              <tr key={rowKey}>
                <th className="px-3 py-3 font-medium">{label}</th>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatNumber(row.requestCount)}
                  {row.failedCount ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({row.failedCount} failed)
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatNumber(row.promptTokens)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatNumber(row.completionTokens)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatNumber(row.totalTokens)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{formatUsd(row.totalCostUsd)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function UsagePage() {
  const { data: report, error, isPending, refetch } = useUsageReport();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Button aria-label="Back to account settings" asChild size="icon-sm" variant="ghost">
          <Link to="/settings">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI usage</h1>
          <p className="text-sm text-muted-foreground">
            See how your AI allowance is being used this month.
          </p>
        </div>
      </div>

      <div className="space-y-8 rounded-xl border border-border bg-card p-5 sm:p-7">
        {isPending ? <p className="text-sm text-muted-foreground">Loading usage…</p> : null}
        {error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">Usage unavailable.</p>
            <Button onClick={() => void refetch()} variant="secondary">
              Try again
            </Button>
          </div>
        ) : null}
        {report ? (
          <>
            <section className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">
                  {periodFormatter.format(new Date(report.range.from))}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {formatUsd(report.monthly.totalCostUsd)} of {formatUsd(report.monthly.limitUsd)}
                </span>
              </div>
              <progress
                aria-label={`AI usage: ${Math.min(100, (report.monthly.totalCostUsd / report.monthly.limitUsd) * 100).toFixed(0)}%`}
                className="h-2 w-full appearance-none overflow-hidden rounded-full border bg-border [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-foreground [&::-webkit-progress-value]:bg-foreground"
                max={100}
                value={Math.min(100, (report.monthly.totalCostUsd / report.monthly.limitUsd) * 100)}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Remaining" value={formatUsd(report.monthly.remainingUsd)} />
                <Metric label="Requests" value={formatNumber(report.summary.requestCount)} />
                <Metric label="Total tokens" value={formatNumber(report.summary.totalTokens)} />
              </div>
              <p className="text-sm text-muted-foreground">
                {report.monthly.isOverLimit
                  ? "You've reached this month's free AI usage limit."
                  : 'Resets at the start of next month.'}
                {report.summary.lastRecordedAt
                  ? ` Last recorded ${new Date(report.summary.lastRecordedAt).toLocaleString()}.`
                  : ''}
              </p>
            </section>

            {report.byFeature.length || report.byModel.length ? (
              <>
                <section className="space-y-3 border-t border-border pt-6">
                  <h2 className="text-base font-semibold">Usage by feature</h2>
                  <UsageTable kind="feature" rows={report.byFeature} />
                </section>
                <section className="space-y-3 border-t border-border pt-6">
                  <h2 className="text-base font-semibold">Usage by model</h2>
                  <UsageTable kind="model" rows={report.byModel} />
                </section>
              </>
            ) : (
              <section className="border-t border-border pt-6">
                <h2 className="font-medium">No AI usage yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your feature and model breakdowns will appear here after you use an AI feature.
                </p>
              </section>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
