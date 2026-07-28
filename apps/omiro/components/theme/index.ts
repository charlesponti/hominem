import { createMakeStyles } from '@ponti-studios/ui/native';

import {
  componentSizes,
  SCREEN_MARGIN_HORIZONTAL,
  theme,
  themeSpacing,
  useTheme,
  useThemeColors,
  type Theme,
} from './theme';

export {
  radii,
  shadows,
  spacing,
  transitionDurations,
  type ColorToken,
  type RadiusToken,
  type SpacingToken,
} from '~/components/theme/tokens';
export { colors } from './tokens';
export { fontFamiliesNative, fontSizes, fontWeights, lineHeights, Text } from './typography';
export { componentSizes, SCREEN_MARGIN_HORIZONTAL, theme, themeSpacing, useTheme, useThemeColors };
export type { Theme };

/** The shared native helper bound to Omiro's own theme shape. */
export const makeStyles = createMakeStyles(useTheme);
