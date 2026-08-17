import { ArrowRightIcon, CheckIcon, SparklesIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '~/lib/utils';

import { getActiveStage, getStageProgress, type ApplicationCockpitVariantProps } from './model';

export function MomentumVariant({
  data,
  activeStageId,
  activePanel,
  onStageChange,
  onPanelChange,
}: ApplicationCockpitVariantProps) {
  const activeStage = getActiveStage(data, activeStageId);
  const progress = getStageProgress(data, activeStageId);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    'onsite-deck': true,
  });

  const activeTasks = useMemo(
    () =>
      activeStage.prepTasks.map((task) => ({
        ...task,
        done: Boolean(completedTasks[task.id]),
      })),
    [activeStage.prepTasks, completedTasks],
  );

  const completedCount = activeTasks.filter((task) => task.done).length;
  const currentSprint = Math.round((completedCount / activeTasks.length) * 100) || 0;

  return (
    <div className="proto-enter flex flex-col gap-6">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <div className="rounded-[32px] border border-border bg-card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="ui-eyebrow text-muted-foreground">Momentum view</p>
              <h1 className="heading-2 mt-3 text-foreground">{data.company}</h1>
              <p className="subheading-4 mt-2 text-muted-foreground">{data.role}</p>
              <p className="body-2 mt-4 max-w-2xl text-muted-foreground">{data.focusSummary}</p>
            </div>
            <div className="rounded-[24px] bg-accent-subtle px-4 py-3 text-accent">
              <p className="footnote">Response tempo</p>
              <p className="body-2 mt-1 font-medium">{data.responseTempo}</p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-border bg-background/80 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="footnote text-muted-foreground">Process progress</p>
                <p className="heading-4 mt-1 text-foreground">
                  Step {progress.activeIndex + 1} of {data.stages.length}
                </p>
              </div>
              <p className="body-3 text-muted-foreground">{data.status}</p>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="proto-progress-fill h-full rounded-full bg-foreground"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-4">
              {data.stages.map((stage, index) => {
                const isActive = stage.id === activeStageId;
                const isComplete = index < progress.activeIndex;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => onStageChange(stage.id)}
                    className={cn(
                      'rounded-[22px] border px-4 py-4 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/50',
                      isActive
                        ? 'border-foreground bg-foreground text-background shadow-[0_14px_32px_rgba(0,0,0,0.12)]'
                        : 'border-border bg-card hover:-translate-y-0.5 hover:bg-muted/40',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="body-3 font-medium">{stage.shortLabel}</span>
                      <span
                        className={cn(
                          'inline-flex size-6 items-center justify-center rounded-full border text-[11px] font-medium',
                          isActive
                            ? 'border-background/30 bg-background/12 text-background'
                            : isComplete
                              ? 'border-success/25 bg-success/10 text-success'
                              : 'border-border bg-background text-muted-foreground',
                        )}
                      >
                        {isComplete ? <CheckIcon className="size-3.5" aria-hidden /> : index + 1}
                      </span>
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
          </div>
        </div>

        <aside className="proto-enter proto-enter-delay-2 rounded-[32px] border border-border bg-foreground p-6 text-background">
          <div className="flex items-center gap-2 text-background/88">
            <SparklesIcon className="size-4" />
            <p className="body-3 font-medium">What unlocks the next signal</p>
          </div>
          <h2 className="heading-4 mt-4 text-background">{activeStage.label}</h2>
          <p className="body-3 mt-3 text-background/72">{activeStage.summary}</p>
          <p className="body-3 mt-6 font-medium text-background">
            Prep sprint {currentSprint}% complete
          </p>
          <ul className="mt-4 space-y-2.5">
            {activeTasks.map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() =>
                    setCompletedTasks((current) => ({
                      ...current,
                      [task.id]: !current[task.id],
                    }))
                  }
                  className={cn(
                    'flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors',
                    task.done
                      ? 'border-background/20 bg-background/10 text-background'
                      : 'border-background/12 bg-transparent text-background/72 hover:bg-background/8',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border',
                      task.done ? 'border-background/30 bg-background/14' : 'border-background/25',
                    )}
                  >
                    {task.done ? <CheckIcon className="size-3" aria-hidden /> : null}
                  </span>
                  <span className="body-3">{task.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="proto-enter proto-enter-delay-3 rounded-[32px] border border-border bg-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="ui-eyebrow text-muted-foreground">Quick focus</p>
            <h2 className="heading-4 mt-2 text-foreground">
              Keep the page pointed at the next move
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.panels.map((panel) => (
              <button
                key={panel.id}
                type="button"
                onClick={() => onPanelChange(panel.id)}
                className={cn(
                  'rounded-full px-4 py-2 body-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/50',
                  panel.id === activePanel
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {panel.label}
              </button>
            ))}
          </div>
        </div>

        {activePanel === 'brief' ? <BriefPanel data={data} /> : null}
        {activePanel === 'timeline' ? (
          <TimelinePanel data={data} activeStageId={activeStageId} />
        ) : null}
        {activePanel === 'packet' ? <PacketPanel data={data} /> : null}
      </section>
    </div>
  );
}

function BriefPanel({ data }: { data: ApplicationCockpitVariantProps['data'] }) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <article className="rounded-[26px] border border-border bg-background/80 p-5">
        <p className="footnote text-muted-foreground">Best narrative to lead with</p>
        <p className="body-2 mt-3 text-foreground">{data.compensationSummary}</p>
        <p className="body-3 mt-3 text-muted-foreground">
          Frame the process around the migration case study, then land on scope and influence.
        </p>
      </article>

      <article className="rounded-[26px] border border-border bg-background/80 p-5">
        <p className="footnote text-muted-foreground">Why this one deserves energy</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {data.signals.map((signal) => (
            <div key={signal.label} className="rounded-2xl bg-muted/50 p-4">
              <p className="footnote text-muted-foreground">{signal.label}</p>
              <p className="body-2 mt-2 font-medium text-foreground">{signal.value}</p>
              <p className="footnote mt-2 text-muted-foreground">{signal.detail}</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

function TimelinePanel({
  data,
  activeStageId,
}: {
  data: ApplicationCockpitVariantProps['data'];
  activeStageId: string;
}) {
  return (
    <div className="mt-6 space-y-3">
      {data.timeline.map((event) => {
        const isLinked = event.label.toLowerCase().includes(activeStageId.replace('-', ' '));

        return (
          <article
            key={event.id}
            className={cn(
              'rounded-[24px] border px-5 py-4 transition-colors',
              isLinked
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background/80',
            )}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightIcon className="size-4" aria-hidden />
                <p className="body-3 font-medium">{event.label}</p>
              </div>
              <p
                className={cn(
                  'footnote',
                  isLinked ? 'text-background/72' : 'text-muted-foreground',
                )}
              >
                {event.date}
              </p>
            </div>
            <p
              className={cn(
                'body-3 mt-3',
                isLinked ? 'text-background/80' : 'text-muted-foreground',
              )}
            >
              {event.detail}
            </p>
          </article>
        );
      })}
    </div>
  );
}

function PacketPanel({ data }: { data: ApplicationCockpitVariantProps['data'] }) {
  return (
    <div className="mt-6 grid gap-3 lg:grid-cols-3">
      {data.packet.map((item) => (
        <article key={item.id} className="rounded-[24px] border border-border bg-background/80 p-5">
          <p className="body-3 font-medium text-foreground">{item.label}</p>
          <p className="body-3 mt-3 text-muted-foreground">{item.detail}</p>
          <p className="footnote mt-4 text-muted-foreground">{item.freshness}</p>
        </article>
      ))}
    </div>
  );
}
