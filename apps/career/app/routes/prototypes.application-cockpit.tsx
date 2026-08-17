import type { CSSProperties } from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MetaFunction } from 'react-router';
import { Link, useSearchParams } from 'react-router';

import { LedgerVariant } from '~/components/prototypes/application-cockpit/LedgerVariant';
import {
  applicationCockpitPrototype,
  type PrototypePanelId,
} from '~/components/prototypes/application-cockpit/model';
import { MomentumVariant } from '~/components/prototypes/application-cockpit/MomentumVariant';
import { SignalVariant } from '~/components/prototypes/application-cockpit/SignalVariant';

export const meta: MetaFunction = () => [
  { title: 'Application cockpit prototype | career' },
  {
    name: 'description',
    content: 'Prototype harness for three application cockpit directions in career.',
  },
];

const variants = [
  {
    name: 'Ledger',
    axis: 'Calm dossier layout with document-style credibility',
    Component: LedgerVariant,
  },
  {
    name: 'Momentum',
    axis: 'Progress-first coaching with an active prep sprint',
    Component: MomentumVariant,
  },
  {
    name: 'Signal',
    axis: 'Decision-support cockpit with stronger process telemetry',
    Component: SignalVariant,
  },
] as const;

const prototypeStyles = `
.proto-stage {
  min-height: calc(100vh - 13rem);
}

.proto-shell {
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--background) 84%, var(--primary) 16%), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--background) 95%, var(--foreground) 5%), var(--background));
}

@keyframes proto-rise {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes proto-fill {
  from {
    opacity: 0.45;
    transform: translateX(-12%) scaleX(0.92);
    transform-origin: left center;
  }

  to {
    opacity: 1;
    transform: translateX(0) scaleX(1);
    transform-origin: left center;
  }
}

.proto-enter {
  animation: proto-rise 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.proto-enter-delay-1 {
  animation-delay: 40ms;
}

.proto-enter-delay-2 {
  animation-delay: 80ms;
}

.proto-enter-delay-3 {
  animation-delay: 120ms;
}

.proto-progress-fill {
  animation: proto-fill 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .proto-enter,
  .proto-enter-delay-1,
  .proto-enter-delay-2,
  .proto-enter-delay-3,
  .proto-progress-fill {
    animation: none;
  }
}

.proto-picker {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.82);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 8px 24px rgba(0, 0, 0, 0.24),
    0 2px 6px rgba(0, 0, 0, 0.12);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1;
  -webkit-font-smoothing: antialiased;
  user-select: none;
  -webkit-user-select: none;
}

.proto-picker-highlight {
  position: absolute;
  top: 4px;
  left: 0;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  will-change: transform;
}

.proto-picker[data-ready] .proto-picker-highlight {
  transition:
    transform 250ms cubic-bezier(0.23, 1, 0.32, 1),
    width 250ms cubic-bezier(0.23, 1, 0.32, 1);
}

@media (prefers-reduced-motion: reduce) {
  .proto-picker[data-ready] .proto-picker-highlight { transition: none; }
}

.proto-picker-item {
  position: relative;
  display: flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font: inherit;
  cursor: pointer;
  transition: color 150ms ease-out;
}

.proto-picker-item:hover {
  color: rgba(255, 255, 255, 0.85);
}

.proto-picker-item:active {
  transform: scale(0.97);
}

.proto-picker-item:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.4);
  outline-offset: 2px;
}

.proto-picker-item[data-active] {
  color: #fff;
}

.proto-picker-divider {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: rgba(255, 255, 255, 0.12);
}

.proto-picker-replay {
  padding: 0 10px;
  font-size: 14px;
}

.proto-picker[data-position="top"] {
  bottom: auto;
  top: 24px;
}
`;

function clampVariantIndex(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), variants.length - 1);
}

function getVariantIndex(searchParams: URLSearchParams) {
  return clampVariantIndex((Number(searchParams.get('v') ?? '1') || 1) - 1);
}

export default function ApplicationCockpitPrototypeRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeIndex, setActiveIndex] = useState(() => getVariantIndex(searchParams));
  const [activeStageId, setActiveStageId] = useState(applicationCockpitPrototype.currentStageId);
  const [activePanel, setActivePanel] = useState<PrototypePanelId>('brief');
  const [replayKey, setReplayKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [highlightStyle, setHighlightStyle] = useState<CSSProperties>({
    width: 0,
    transform: 'translateX(0px)',
  });

  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const ActiveVariant = variants[activeIndex]?.Component ?? variants[0].Component;

  useEffect(() => {
    const nextIndex = getVariantIndex(searchParams);

    if (nextIndex !== activeIndex) {
      setActiveIndex(nextIndex);
    }
  }, [activeIndex, searchParams]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReady(true);
      });
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useLayoutEffect(() => {
    const activeButton = buttonRefs.current[activeIndex];

    if (!activeButton) return;

    setHighlightStyle({
      width: activeButton.offsetWidth,
      transform: `translateX(${activeButton.offsetLeft}px)`,
    });
  }, [activeIndex]);

  useEffect(() => {
    const moveHighlight = () => {
      const activeButton = buttonRefs.current[activeIndex];

      if (!activeButton) return;

      setHighlightStyle({
        width: activeButton.offsetWidth,
        transform: `translateX(${activeButton.offsetLeft}px)`,
      });
    };

    window.addEventListener('resize', moveHighlight);

    return () => window.removeEventListener('resize', moveHighlight);
  }, [activeIndex]);

  const setVariant = useMemo(
    () => (index: number) => {
      const nextIndex = clampVariantIndex(index);
      const nextParams = new URLSearchParams(searchParams);

      nextParams.set('v', String(nextIndex + 1));
      setActiveIndex(nextIndex);
      setSearchParams(nextParams, { preventScrollReset: true, replace: true });
      setReplayKey((current) => current + 1);
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const numericKey = Number.parseInt(event.key, 10);

      if (numericKey >= 1 && numericKey <= variants.length) {
        setVariant(numericKey - 1);
        return;
      }

      if (event.key === 'ArrowRight') {
        setVariant((activeIndex + 1) % variants.length);
        return;
      }

      if (event.key === 'ArrowLeft') {
        setVariant((activeIndex - 1 + variants.length) % variants.length);
        return;
      }

      if (event.key === 'r' || event.key === 'R') {
        setReplayKey((current) => current + 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, setVariant]);

  return (
    <div className="proto-shell proto-stage rounded-[32px] border border-border/60 px-4 py-6 sm:px-6 sm:py-8">
      <style>{prototypeStyles}</style>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-24">
        <header className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="ui-eyebrow text-muted-foreground">Prototype · Application cockpit</p>
            <h1 className="heading-3 mt-3 text-foreground">
              A focused top-of-page control surface for a live application
            </h1>
            <p className="body-3 mt-3 max-w-3xl text-muted-foreground">
              Highest-leverage target chosen for this run: the application detail header and its
              immediate working surface. It is high-frequency, carries the search state, and
              benefits most from stronger status, progress, and prep cues.
            </p>
          </div>
          <Link
            to="/applications"
            className="footnote inline-flex w-fit rounded-full border border-border bg-card px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to applications
          </Link>
        </header>

        <section aria-label="Prototype stage" id="stage">
          <ActiveVariant
            key={`${activeIndex}-${replayKey}`}
            data={applicationCockpitPrototype}
            activeStageId={activeStageId}
            activePanel={activePanel}
            onStageChange={setActiveStageId}
            onPanelChange={setActivePanel}
          />
        </section>
      </div>

      <nav
        className="proto-picker"
        aria-label="Prototype variants"
        data-ready={ready ? '' : undefined}
      >
        <span className="proto-picker-highlight" aria-hidden="true" style={highlightStyle} />
        {variants.map((variant, index) => (
          <button
            key={variant.name}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            className="proto-picker-item"
            data-active={index === activeIndex ? '' : undefined}
            aria-current={index === activeIndex ? 'true' : undefined}
            onClick={() => setVariant(index)}
          >
            {variant.name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true"></span>
        <button
          className="proto-picker-item proto-picker-replay"
          aria-label="Replay animation (R)"
          onClick={() => setReplayKey((current) => current + 1)}
        >
          ↻
        </button>
      </nav>
    </div>
  );
}
