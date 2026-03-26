import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

import { cn } from '../../lib/utils';

export interface LandingFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface LandingStep {
  label: string;
  description: string;
}

export interface LandingPageProps {
  kicker: string;
  headline: React.ReactNode;
  sub: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  problem: string;
  features: LandingFeature[];
  steps: LandingStep[];
  trustSignal?: string;
}

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn('py-20 md:py-28', className)}>{children}</section>;
}

function FeatureCard({ feature }: { feature: LandingFeature }) {
  const Icon = feature.icon;
  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-6 transition-all duration-200 hover:border-[var(--color-border-default)] hover:shadow-[var(--shadow-low)]">
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-subtle)]"
        aria-hidden="true"
      >
        <Icon size={18} strokeWidth={1.5} className="text-[var(--color-accent)]" />
      </div>
      <div>
        <h3 className="mb-1.5 text-[15px] font-semibold text-[var(--color-text-primary)]">
          {feature.title}
        </h3>
        <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          {feature.description}
        </p>
      </div>
    </div>
  );
}

export function LandingPage({
  kicker,
  headline,
  sub,
  ctaPrimary,
  ctaSecondary,
  problem,
  features,
  steps,
  trustSignal,
}: LandingPageProps) {
  return (
    <div className="text-[var(--color-text-primary)]">
      {/* Hero */}
      <Section className="pb-20 pt-28 md:pb-28 md:pt-36">
        <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
          {kicker}
        </p>

        <h1
          className="mb-6 max-w-[14ch] font-semibold leading-[1.06] tracking-[-0.035em] text-[var(--color-text-primary)]"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4.5rem)' }}
        >
          {headline}
        </h1>

        <p className="mb-10 max-w-[44ch] text-lg font-light leading-relaxed text-[var(--color-text-secondary)] md:text-xl">
          {sub}
        </p>

        <div className="flex flex-col items-start gap-3 sm:flex-row">
          <Link
            to={ctaPrimary.href}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(212,165,116,0.25)] transition-all duration-150 hover:shadow-[0_4px_20px_rgba(212,165,116,0.35)] active:scale-[0.98]"
          >
            {ctaPrimary.label}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>

          {ctaSecondary && (
            <Link
              to={ctaSecondary.href}
              className="inline-flex items-center gap-1.5 rounded-xl px-6 py-3.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
            >
              {ctaSecondary.label}
            </Link>
          )}
        </div>
      </Section>

      <div className="h-px bg-[var(--color-border-subtle)]" />

      {/* Problem */}
      <Section>
        <p className="max-w-[52ch] text-xl font-light leading-relaxed text-[var(--color-text-secondary)] md:text-2xl">
          {problem}
        </p>
      </Section>

      <div className="h-px bg-[var(--color-border-subtle)]" />

      {/* Features */}
      <Section>
        <p className="mb-10 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
          What it does
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </div>
      </Section>

      <div className="h-px bg-[var(--color-border-subtle)]" />

      {/* How it works */}
      <Section>
        <p className="mb-10 text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-accent)]">
          How it works
        </p>
        <ol className="m-0 flex list-none flex-col gap-8 p-0">
          {steps.map((step, i) => (
            <li key={step.label} className="flex items-start gap-5">
              <span
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-subtle)] font-mono text-[11px] font-semibold tabular-nums text-[var(--color-accent)]"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="mb-1 text-[15px] font-semibold text-[var(--color-text-primary)]">
                  {step.label}
                </h3>
                <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <div className="h-px bg-[var(--color-border-subtle)]" />

      {/* Final CTA */}
      <Section className="pb-32 md:pb-40">
        <h2
          className="mb-8 max-w-[18ch] font-semibold leading-[1.06] tracking-[-0.035em] text-[var(--color-text-primary)]"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 3rem)' }}
        >
          Ready to start?
        </h2>
        <Link
          to={ctaPrimary.href}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(212,165,116,0.25)] transition-all duration-150 hover:shadow-[0_4px_20px_rgba(212,165,116,0.35)] active:scale-[0.98]"
        >
          {ctaPrimary.label}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
        {trustSignal && (
          <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-tertiary)]">
            {trustSignal}
          </p>
        )}
      </Section>
    </div>
  );
}
