import { colors } from './colors';
import { radii, radiiNative } from './radii';
import { spacing } from './spacing';

export const chatTokens = {
  transcriptMaxWidth: 768,
  searchMaxWidth: 640,
  userBubbleMaxWidth: 544,
  turnGap: spacing[5],
  turnPaddingY: spacing[2],
  contentGap: spacing[2],
  metadataGap: spacing[1],
  composerPadding: spacing[4],
  composerGap: spacing[3],
  composerFooterGap: spacing[2],
  suggestionGap: spacing[2],
  surfaces: {
    assistant: 'transparent',
    user: colors['emphasis-highest'],
    system: colors['bg-surface'],
    composer: colors['prompt-bg'],
    suggestion: colors['bg-base'],
    debug: colors['bg-surface'],
  },
  borders: {
    user: colors['border-subtle'],
    system: colors['border-default'],
    composer: colors['prompt-border'],
    suggestion: colors['border-default'],
    debug: colors['border-subtle'],
  },
  foregrounds: {
    user: colors.white,
    metadata: colors['text-tertiary'],
    system: colors['text-secondary'],
  },
  radii: {
    bubble: radii.md,
    composer: radii.md,
    suggestion: radii.md,
    debug: radii.md,
  },
} as const;

export const chatTokensNative = {
  ...chatTokens,
  radii: {
    bubble: radiiNative.md,
    composer: radiiNative.md,
    suggestion: radiiNative.md,
    debug: radiiNative.md,
  },
} as const;

export type ChatToken = keyof typeof chatTokens;
