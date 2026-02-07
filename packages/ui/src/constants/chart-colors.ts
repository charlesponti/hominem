/**
 * Chart Colors for Kanso Monochrome Design System
 *
 * Use these constants for consistent chart styling across the application.
 * All charts should use grayscale colors with red for negative/destructive values.
 */

export const CHART_COLORS = {
  /** Primary grayscale shades for multi-category charts */
  chart1: 'rgba(255, 255, 255, 0.9)',
  chart2: 'rgba(255, 255, 255, 0.7)',
  chart3: 'rgba(255, 255, 255, 0.5)',
  chart4: 'rgba(255, 255, 255, 0.3)',
  chart5: 'rgba(255, 255, 255, 0.15)',

  /** Semantic chart colors for meaning-based visualization */
  positive: 'rgba(255, 255, 255, 0.7)', // income, growth, success
  negative: '#ff0000', // expenses, decline, errors
  neutral: 'rgba(255, 255, 255, 0.5)', // baseline, reference lines

  /** Chart background and grid */
  background: '#000000',
  grid: 'rgba(255, 255, 255, 0.1)',

  /** Axis and label colors */
  axis: 'rgba(255, 255, 255, 0.4)',
  label: 'rgba(255, 255, 255, 0.7)',

  /** Tooltip styling */
  tooltip: {
    background: '#ffffff',
    text: '#000000',
    border: 'rgba(255, 255, 255, 0.2)',
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
