import { colors } from '../tokens';

/**
 * Chart Colors — Warm Terminal Design System
 *
 * Use these constants for consistent chart styling across the application.
 * Charts use warm-tinted opacity scale with semantic tokens for meaning.
 */

export const CHART_COLORS = {
  /** Primary warm-tinted shades for multi-category charts */
  chart1: 'rgba(28, 25, 23, 0.9)',
  chart2: 'rgba(28, 25, 23, 0.7)',
  chart3: 'rgba(28, 25, 23, 0.5)',
  chart4: 'rgba(28, 25, 23, 0.3)',
  chart5: 'rgba(28, 25, 23, 0.15)',

  /** Semantic chart colors for meaning-based visualization */
  positive: colors.success,
  negative: colors.destructive,
  neutral: 'rgba(28, 25, 23, 0.5)',

  /** Chart background and grid */
  background: colors['bg-base'],
  grid: 'rgba(28, 25, 23, 0.06)',

  /** Axis and label colors */
  axis: 'rgba(28, 25, 23, 0.2)',
  label: colors['text-secondary'],

  /** Tooltip styling */
  tooltip: {
    background: colors['bg-elevated'],
    text: colors['text-primary'],
    border: colors['border-default'],
  },
} as const;

/** CSS custom property references for use in inline styles */
export const CHART_CSS_VARS = {
  positive: 'var(--color-chart-positive)',
  negative: 'var(--color-chart-negative)',
  neutral: 'var(--color-chart-neutral)',
  chart1: 'var(--color-chart-1)',
  chart2: 'var(--color-chart-2)',
  chart3: 'var(--color-chart-3)',
  chart4: 'var(--color-chart-4)',
  chart5: 'var(--color-chart-5)',
} as const;
