import { nativeShadows } from '@ponti-studios/ui/native';
import {
  colorThemes,
  radii,
  shadows,
  spacing as sharedSpacing,
  transitionDurations,
  type ColorMode,
  type ColorTheme,
  type ColorToken,
  type RadiusToken,
  type SpacingToken,
} from '@ponti-studios/ui/tokens';

export { colorThemes, nativeShadows, radii, shadows, transitionDurations };
export type { ColorMode, ColorTheme, ColorToken, RadiusToken, SpacingToken };

/** Keep Omiro's existing numeric spacing call sites over the string-keyed shared scale. */
export const spacing: Record<number, number> = Object.fromEntries(
  Object.entries(sharedSpacing)
    .filter(([key]) => /^\d+$/.test(key))
    .map(([key, value]) => [Number(key), value]),
);

/** Non-react consumers must select a concrete system theme explicitly. */
export const colors = colorThemes.dark;
