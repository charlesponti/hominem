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
    <div className="flex flex-col gap-4">
      <div
        className="flex size-9 shrink-0 items-center justify-center border border-border/30"
        aria-hidden="true"
      >
        <Icon size={16} strokeWidth={1.5} className="text-text-secondary" />
      </div>
      <div>
        <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-text-primary">
          {feature.title}
        </h3>
        <p className="text-sm leading-relaxed text-text-tertiary">{feature.description}</p>
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
    <div className="text-text-primary">
      {/* Hero */}
      <Section className="pb-20 pt-28 md:pb-28 md:pt-36">
        <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.18em] text-text-tertiary">
          {kicker}
        </p>

        <h1
          className="mb-6 max-w-[14ch] font-semibold leading-[1.08] tracking-[-0.04em] text-text-primary"
          style={{ fontSize: 'clamp(2.25rem, 5vw, 4.5rem)' }}
        >
          {headline}
        </h1>

        <p className="mb-10 max-w-[44ch] text-lg font-light leading-relaxed text-text-secondary md:text-xl">
          {sub}
        </p>

        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <Link
            to={ctaPrimary.href}
            className="inline-flex items-center gap-2 bg-foreground px-6 py-3 text-sm font-semibold uppercase tracking-wide text-background transition-opacity duration-150 hover:opacity-80"
          >
            {ctaPrimary.label}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>

          {ctaSecondary && (
            <Link
              to={ctaSecondary.href}
              className="inline-flex items-center gap-1.5 px-6 py-3 text-sm font-medium text-text-tertiary transition-colors duration-150"
            >
              {ctaSecondary.label}
            </Link>
          )}
        </div>
      </Section>

      <div className="border-t border-border/20" />

      {/* Problem */}
      <Section>
        <p className="max-w-[52ch] text-xl font-light leading-relaxed text-text-secondary md:text-2xl">
          {problem}
        </p>
      </Section>

      <div className="border-t border-border/20" />

      {/* Features */}
      <Section>
        <p className="mb-12 text-[11px] font-medium uppercase tracking-[0.18em] text-text-tertiary">
          What it does
        </p>
        <div className="grid grid-cols-1 gap-x-16 gap-y-12 sm:grid-cols-2">
          {features.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </div>
      </Section>

      <div className="border-t border-border/20" />

      {/* How it works */}
      <Section>
        <p className="mb-12 text-[11px] font-medium uppercase tracking-[0.18em] text-text-tertiary">
          How it works
        </p>
        <ol className="m-0 flex list-none flex-col gap-10 p-0">
          {steps.map((step, i) => (
            <li key={step.label} className="flex items-start gap-6">
              <span
                className="mt-0.5 w-5 shrink-0 font-mono text-[11px] font-medium tabular-nums text-text-tertiary"
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-text-primary">
                  {step.label}
                </h3>
                <p className="text-sm leading-relaxed text-text-tertiary">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <div className="border-t border-border/20" />

      {/* Final CTA */}
      <Section className="pb-32 md:pb-40">
        <h2
          className="mb-8 max-w-[18ch] font-semibold leading-[1.08] tracking-[-0.04em] text-text-primary"
          style={{ fontSize: 'clamp(1.75rem, 3.5vw, 3rem)' }}
        >
          Ready to start?
        </h2>
        <Link
          to={ctaPrimary.href}
          className="inline-flex items-center gap-2 bg-foreground px-6 py-3 text-sm font-semibold uppercase tracking-wide text-background transition-opacity duration-150 hover:opacity-80"
        >
          {ctaPrimary.label}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
        {trustSignal && (
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-text-tertiary">
            {trustSignal}
          </p>
        )}
      </Section>
    </div>
  );
}
