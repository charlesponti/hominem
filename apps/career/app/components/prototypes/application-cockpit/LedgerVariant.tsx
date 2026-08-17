import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CircleIcon,
  FileTextIcon,
  TimerIcon,
} from 'lucide-react';

import { cn } from '~/lib/utils';

import { getActiveStage, type ApplicationCockpitVariantProps } from './model';

export function LedgerVariant({
  data,
  activeStageId,
  activePanel,
  onStageChange,
  onPanelChange,
}: ApplicationCockpitVariantProps) {
  const activeStage = getActiveStage(data, activeStageId);

  return (
    <div className="proto-enter flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-[28px] border border-border bg-card/85 p-6 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <p className="ui-eyebrow text-muted-foreground">Application brief</p>
          <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="heading-2 text-foreground">{data.role}</h1>
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
              <p className="body-2 mt-4 max-w-2xl text-muted-foreground">{data.focusSummary}</p>
            </div>

            <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 text-right">
              <p className="footnote text-muted-foreground">Status</p>
              <p className="body-2 mt-1 font-medium text-foreground">{data.status}</p>
              <p className="footnote mt-2 text-muted-foreground">{data.updatedAt}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FactCard label="Recruiter" value={data.recruiter} />
            <FactCard label="Source" value={data.source} />
            <FactCard label="Comp" value={data.compensationSummary} />
            <FactCard label="Packet" value={data.packetSummary} />
          </div>
        </section>

        <aside className="proto-enter proto-enter-delay-1 rounded-[28px] border border-border bg-muted/30 p-5">
          <div className="flex items-center gap-2 text-foreground">
            <TimerIcon className="size-4" />
            <p className="body-3 font-medium">Current stage</p>
          </div>
          <p className="heading-4 mt-4 text-foreground">{activeStage.label}</p>
          <p className="body-3 mt-2 text-muted-foreground">{activeStage.summary}</p>
          <dl className="mt-5 space-y-3">
            <StageMeta label="Scheduled" value={activeStage.scheduled} />
            <StageMeta label="Owner" value={activeStage.owner} />
            <StageMeta label="Next move" value={activeStage.nextAction} />
          </dl>
        </aside>
      </div>

      <section className="proto-enter proto-enter-delay-2 rounded-[28px] border border-border bg-card p-3">
        <div className="grid gap-2 md:grid-cols-4">
          {data.stages.map((stage, index) => {
            const isActive = stage.id === activeStageId;
            const isComplete = index < data.stages.findIndex((item) => item.id === activeStageId);

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onStageChange(stage.id)}
                className={cn(
                  'rounded-[20px] border px-4 py-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/50',
                  isActive
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background/75 text-foreground hover:bg-muted/60',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="body-3 font-medium">{stage.shortLabel}</span>
                  {isComplete ? (
                    <CheckCircle2Icon className="size-4" aria-hidden />
                  ) : (
                    <CircleIcon className="size-4" aria-hidden />
                  )}
                </div>
                <p
                  className={cn(
                    'footnote mt-3',
                    isActive ? 'text-background/72' : 'text-muted-foreground',
                  )}
                >
                  {stage.scheduled}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="proto-enter proto-enter-delay-3 rounded-[32px] border border-border bg-card p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="ui-eyebrow text-muted-foreground">Working surface</p>
            <h2 className="heading-4 mt-2 text-foreground">A calmer application cockpit</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.panels.map((panel) => (
              <PanelButton
                key={panel.id}
                active={panel.id === activePanel}
                label={panel.label}
                onClick={() => onPanelChange(panel.id)}
              />
            ))}
          </div>
        </div>

        {activePanel === 'brief' ? <BriefPanel data={data} activeStageId={activeStageId} /> : null}
        {activePanel === 'timeline' ? <TimelinePanel data={data} /> : null}
        {activePanel === 'packet' ? <PacketPanel data={data} /> : null}
      </section>
    </div>
  );
}

function FactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/75 px-4 py-3">
      <p className="footnote text-muted-foreground">{label}</p>
      <p className="body-3 mt-2 text-foreground">{value}</p>
    </div>
  );
}

function StageMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="footnote text-muted-foreground">{label}</dt>
      <dd className="body-3 mt-1 text-foreground">{value}</dd>
    </div>
  );
}

function PanelButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-2 body-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/50',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-background text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
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
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
      <div className="space-y-6">
        <section className="rounded-[24px] border border-border bg-background/70 p-5">
          <div className="flex items-center gap-2 text-foreground">
            <ArrowUpRightIcon className="size-4" />
            <h3 className="body-3 font-medium">What to emphasize next</h3>
          </div>
          <p className="body-2 mt-4 text-muted-foreground">{activeStage.nextAction}</p>
        </section>

        <section className="rounded-[24px] border border-border bg-background/70 p-5">
          <div className="flex items-center gap-2 text-foreground">
            <FileTextIcon className="size-4" />
            <h3 className="body-3 font-medium">Why this process is alive</h3>
          </div>
          <ul className="mt-4 space-y-3">
            {data.strengths.map((strength) => (
              <li key={strength} className="body-3 text-muted-foreground">
                {strength}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-[24px] border border-border bg-muted/25 p-5">
        <h3 className="body-3 font-medium text-foreground">Prep checklist</h3>
        <ul className="mt-4 space-y-3">
          {activeStage.prepTasks.map((task) => (
            <li key={task.id} className="flex items-start gap-3">
              <span className="mt-0.5 text-success">
                <CheckCircle2Icon className="size-4" aria-hidden />
              </span>
              <span className="body-3 text-muted-foreground">{task.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TimelinePanel({ data }: { data: ApplicationCockpitVariantProps['data'] }) {
  return (
    <div className="mt-6 space-y-3">
      {data.timeline.map((event) => (
        <article
          key={event.id}
          className="rounded-[24px] border border-border bg-background/70 px-5 py-4"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="body-3 font-medium text-foreground">{event.label}</h3>
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
    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      {data.packet.map((item) => (
        <article key={item.id} className="rounded-[24px] border border-border bg-background/70 p-5">
          <h3 className="body-3 font-medium text-foreground">{item.label}</h3>
          <p className="body-3 mt-3 text-muted-foreground">{item.detail}</p>
          <p className="footnote mt-4 text-muted-foreground">{item.freshness}</p>
        </article>
      ))}
    </div>
  );
}
