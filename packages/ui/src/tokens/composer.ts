/**
 * Composer and input-surface density tokens.
 *
 * These values define the tighter interaction rhythm used by composer-like
 * controls and can be reused across prompt inputs, toolbars, and compact
 * action rows.
 */
export const composerTokens = {
  maxWidth: '52rem',
  panel: {
    radius: 20,
    paddingX: 16,
    paddingTop: 12,
    paddingBottom: 10,
    rowGap: 8,
    viewportInsetX: 16,
    viewportInsetBottom: 12,
  },
  controls: {
    heightCompact: 32,
    heightDefault: 34,
    heightComfortable: 40,
  },
  icon: {
    sm: 14,
    md: 16,
    lg: 18,
  },
  textarea: {
    minHeightDefault: 44,
    minHeightDraft: 48,
  },
} as const;

export type ComposerToken = keyof typeof composerTokens;
