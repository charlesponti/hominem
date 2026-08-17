import { ActivityIcon, AlertTriangleIcon, GaugeIcon, ShieldCheckIcon } from 'lucide-react';

import { cn } from '~/lib/utils';

import { getActiveStage, getStageProgress, type ApplicationCockpitVariantProps } from './model';

export function SignalVariant({
  data,
  activeStageId,
  activePanel,
  onStageChange,
  onPanelChange,
}: ApplicationCockpitVariantProps) {
  const activeStage = getActiveStage(data, activeStageId);
  const progress = getStageProgress(data, activeStageId);

  return (
    <div className="proto-enter grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="proto-enter proto-enter-delay-1 rounded-[32px] border border-border bg-card p-5">
        <p className="ui-eyebrow text-muted-foreground">Signal rail</p>
        <div className="mt-5 space-y-2">
          {data.stages.map((stage, index) => {
            const isActive = stage.id === activeStageId;
            const isComplete = index < progress.activeIndex;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onStageChange(stage.id)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-[24px] border px-4 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/50',
                  isActive
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background hover:bg-muted/50',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border body-3 font-medium',
                    isActive
                      ? 'border-background/20 bg-background/12 text-background'
                      : isComplete
                        ? 'border-success/25 bg-success/10 text-success'
                        : 'border-border text-muted-foreground',
                  )}
                >
                  {index + 1}
                </span>
                <span>
                  <span className="body-3 block font-medium">{stage.label}</span>
                  <span
                    className={cn(
                      'footnote mt-1 block',
                      isActive ? 'text-background/70' : 'text-muted-foreground',
                    )}
                  >
                    {stage.scheduled}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex flex-col gap-6">
        <section className="rounded-[32px] border border-border bg-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="ui-eyebrow text-muted-foreground">Decision surface</p>
              <h1 className="heading-2 mt-3 text-foreground">{data.role}</h1>
              <p className="body-2 mt-2 text-muted-foreground">
                <span className="font-medium text-foreground">{data.company}</span>
                <span aria-hidden className="mx-2 text-muted-foreground/40">
                  ·
                </span>
                {data.location}
                <span aria-hidden className="mx-2 text-muted-foreground/40">
                  ·
                </span>
                {data.arrangement}
              </p>
            </div>
            <div className="rounded-[24px] border border-border bg-background/80 px-4 py-3">
              <p className="footnote text-muted-foreground">Current read</p>
              <p className="body-2 mt-1 font-medium text-foreground">{activeStage.label}</p>
              <p className="footnote mt-2 text-muted-foreground">{data.updatedAt}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            <SignalCard
              icon={<GaugeIcon className="size-4" aria-hidden />}
              label="Process strength"
              value={data.signals[0]?.value ?? 'High'}
              detail={data.signals[0]?.detail ?? ''}
              meter={86}
            />
            <SignalCard
              icon={<ActivityIcon className="size-4" aria-hidden />}
              label="Pace"
              value={data.signals[1]?.value ?? 'Fast'}
              detail={data.signals[1]?.detail ?? ''}
              meter={72}
            />
            <SignalCard
              icon={<ShieldCheckIcon className="size-4" aria-hidden />}
              label="Negotiation room"
              value={data.signals[2]?.value ?? 'Open'}
              detail={data.signals[2]?.detail ?? ''}
              meter={58}
            />
          </div>

          <div className="mt-6 rounded-[28px] border border-border bg-background/80 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="footnote text-muted-foreground">What to do next</p>
                <p className="body-2 mt-1 text-foreground">{activeStage.nextAction}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {data.panels.map((panel) => (
                  <button
                    key={panel.id}
                    type="button"
                    onClick={() => onPanelChange(panel.id)}
                    className={cn(
                      'rounded-full border px-3 py-2 body-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/50',
                      panel.id === activePanel
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {panel.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="proto-enter proto-enter-delay-2 rounded-[32px] border border-border bg-card p-6">
          {activePanel === 'brief' ? (
            <BriefPanel data={data} activeStageId={activeStageId} />
          ) : null}
          {activePanel === 'timeline' ? <TimelinePanel data={data} /> : null}
          {activePanel === 'packet' ? <PacketPanel data={data} /> : null}
        </section>
      </div>
    </div>
  );
}

function SignalCard({
  detail,
  icon,
  label,
  meter,
  value,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  meter: number;
  value: string;
}) {
  return (
    <article className="rounded-[24px] border border-border bg-background/80 p-5">
      <div className="flex items-center gap-2 text-foreground">
        {icon}
        <p className="body-3 font-medium">{label}</p>
      </div>
      <p className="heading-4 mt-4 text-foreground">{value}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="proto-progress-fill h-full rounded-full bg-foreground"
          style={{ width: `${meter}%` }}
        />
      </div>
      <p className="footnote mt-3 text-muted-foreground">{detail}</p>
    </article>
  );
}

function BriefPanel({
  data,
  activeStageId,
}: {
  data: ApplicationCockpitVariantProps['data'];
  activeStageId: string;
}) {
  const activeStage = getActiveStage(data, activeStageId);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <article className="rounded-[28px] border border-border bg-background/80 p-5">
        <p className="footnote text-muted-foreground">Positive signals</p>
        <ul className="mt-4 space-y-3">
          {data.strengths.map((strength) => (
            <li key={strength} className="body-3 text-muted-foreground">
              {strength}
            </li>
          ))}
        </ul>
      </article>

      <article className="rounded-[28px] border border-destructive/20 bg-destructive/5 p-5">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangleIcon className="size-4" aria-hidden />
          <p className="body-3 font-medium">What could weaken the loop</p>
        </div>
        <ul className="mt-4 space-y-3">
          {data.risks.map((risk) => (
            <li key={risk} className="body-3 text-muted-foreground">
              {risk}
            </li>
          ))}
        </ul>
        <p className="body-3 mt-4 text-foreground">Active watchpoint: {activeStage.summary}</p>
      </article>
    </div>
  );
}

function TimelinePanel({ data }: { data: ApplicationCockpitVariantProps['data'] }) {
  return (
    <div className="grid gap-3">
      {data.timeline.map((event) => (
        <article
          key={event.id}
          className="rounded-[24px] border border-border bg-background/80 px-5 py-4"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="body-3 font-medium text-foreground">{event.label}</p>
            <p className="footnote text-muted-foreground">{event.date}</p>
          </div>
          <p className="body-3 mt-3 text-muted-foreground">{event.detail}</p>
        </article>
      ))}
    </div>
  );
}

function PacketPanel({ data }: { data: ApplicationCockpitVariantProps['data'] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.75fr)]">
      <div className="grid gap-3">
        {data.packet.map((item) => (
          <article
            key={item.id}
            className="rounded-[24px] border border-border bg-background/80 p-5"
          >
            <p className="body-3 font-medium text-foreground">{item.label}</p>
            <p className="body-3 mt-3 text-muted-foreground">{item.detail}</p>
            <p className="footnote mt-4 text-muted-foreground">{item.freshness}</p>
          </article>
        ))}
      </div>

      <aside className="rounded-[24px] border border-border bg-muted/30 p-5">
        <p className="footnote text-muted-foreground">Packet confidence</p>
        <p className="heading-4 mt-3 text-foreground">Ready to send again</p>
        <p className="body-3 mt-3 text-muted-foreground">
          The packet is fresh, the proof is role-aligned, and the narrative is coherent across
          resume and portfolio.
        </p>
      </aside>
    </div>
  );
}
