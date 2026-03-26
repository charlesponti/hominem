/**
 * Spacing tokens — 8px primary grid, 4px secondary.
 *
 * Values are unitless numbers (px on web via CSS vars, logical pixels on
 * mobile). Must match --spacing-* in packages/ui/src/styles/globals.css.
 */

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;

/**
 * Content width tokens for constraining max-width of content.
 * Used for message bubbles, transcript areas, and other content containers.
 */
export const contentWidths = {
  bubble: '36rem', // Compact message bubble width (576px)
  transcript: '44rem', // Standard transcript/content width (704px)
} as const;

export type SpacingToken = keyof typeof spacing;
export type ContentWidthToken = keyof typeof contentWidths;
