import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';

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
  /** Short category label. E.g. "PLACES" or "PERSONAL FINANCE" */
  kicker: string;
  /** 2-line max. Can include <em> for emphasis. */
  headline: React.ReactNode;
  /** One sentence. Name the problem and the user. */
  sub: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  /** 2-3 punchy sentences. Problem framing, no solution yet. */
  problem: string;
  /** 3-4 features. Icon + noun title + 1 sentence. */
  features: LandingFeature[];
  /** 3 numbered steps. How it actually works. */
  steps: LandingStep[];
  /** Trust signal beneath the final CTA. E.g. "Free to use. No credit card." */
  trustSignal?: string;
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`py-20 md:py-28 px-6 md:px-12 lg:px-20 max-w-5xl ${className}`}>
      {children}
    </section>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ feature }: { feature: LandingFeature }) {
  const Icon = feature.icon;
  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex items-center justify-center w-9 h-9 shrink-0"
        style={{ border: '1px solid rgba(255,255,255,0.12)' }}
        aria-hidden="true"
      >
        <Icon size={16} strokeWidth={1.5} style={{ color: 'var(--color-text-secondary)' }} />
      </div>
      <div>
        <h3
          className="text-sm font-semibold mb-1.5 tracking-wide uppercase"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {feature.title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
          {feature.description}
        </p>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

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
    <div style={{ color: 'var(--color-text-primary)' }}>

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <Section className="pt-28 md:pt-36 pb-20 md:pb-28">
        {/* Kicker */}
        <p
          className="text-[11px] font-medium tracking-[0.18em] uppercase mb-6"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {kicker}
        </p>

        {/* Headline */}
        <h1
          className="font-semibold leading-[1.08] tracking-[-0.04em] mb-6"
          style={{
            fontSize: 'clamp(2.25rem, 5vw, 4.5rem)',
            color: 'var(--color-text-primary)',
            maxWidth: '14ch',
          }}
        >
          {headline}
        </h1>

        {/* Sub */}
        <p
          className="text-lg md:text-xl font-light leading-relaxed mb-10"
          style={{ color: 'var(--color-text-secondary)', maxWidth: '44ch' }}
        >
          {sub}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <Link
            to={ctaPrimary.href}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity duration-150 hover:opacity-80"
            style={{
              background: 'var(--color-text-primary)',
              color: 'var(--color-bg-base)',
            }}
          >
            {ctaPrimary.label}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>

          {ctaSecondary && (
            <Link
              to={ctaSecondary.href}
              className="inline-flex items-center gap-1.5 px-6 py-3 text-sm font-medium transition-colors duration-150"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {ctaSecondary.label}
            </Link>
          )}
        </div>
      </Section>

      <Divider />

      {/* ── 2. PROBLEM ──────────────────────────────────────────────────────── */}
      <Section>
        <p
          className="text-xl md:text-2xl font-light leading-relaxed"
          style={{ color: 'var(--color-text-secondary)', maxWidth: '52ch' }}
        >
          {problem}
        </p>
      </Section>

      <Divider />

      {/* ── 3. FEATURES ─────────────────────────────────────────────────────── */}
      <Section>
        <p
          className="text-[11px] font-medium tracking-[0.18em] uppercase mb-12"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          What it does
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-16 gap-y-12">
          {features.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </div>
      </Section>

      <Divider />

      {/* ── 4. HOW IT WORKS ─────────────────────────────────────────────────── */}
      <Section>
        <p
          className="text-[11px] font-medium tracking-[0.18em] uppercase mb-12"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          How it works
        </p>
        <ol className="flex flex-col gap-10 list-none m-0 p-0">
          {steps.map((step, i) => (
            <li key={step.label} className="flex gap-6 items-start">
              <span
                className="text-[11px] font-mono font-medium tabular-nums mt-0.5 shrink-0 w-5"
                style={{ color: 'var(--color-text-tertiary)' }}
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3
                  className="text-sm font-semibold mb-1 tracking-wide uppercase"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {step.label}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Divider />

      {/* ── 5. FINAL CTA ────────────────────────────────────────────────────── */}
      <Section className="pb-32 md:pb-40">
        <h2
          className="font-semibold leading-[1.08] tracking-[-0.04em] mb-8"
          style={{
            fontSize: 'clamp(1.75rem, 3.5vw, 3rem)',
            color: 'var(--color-text-primary)',
            maxWidth: '18ch',
          }}
        >
          Ready to start?
        </h2>
        <Link
          to={ctaPrimary.href}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity duration-150 hover:opacity-80"
          style={{
            background: 'var(--color-text-primary)',
            color: 'var(--color-bg-base)',
          }}
        >
          {ctaPrimary.label}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
        {trustSignal && (
          <p
            className="mt-4 text-xs font-mono tracking-widest uppercase"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {trustSignal}
          </p>
        )}
      </Section>

    </div>
  );
}
