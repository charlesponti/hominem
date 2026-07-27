import type { SFSymbol } from 'expo-symbols';
import { Image, type ImageSourcePropType, Pressable, Text, View } from 'react-native';

import {
  componentSizes,
  fontSizes,
  fontWeights,
  makeStyles,
  radii,
  useThemeColors,
} from '~/components/theme';

import AppIcon from './icon';

interface SegmentedToggleOption<T extends string> {
  value: T;
  /** Text label. Mutually exclusive with `icon`/`sfSymbol` — a toggle is either all-text or all-icon. */
  label?: string;
  /** Custom PNG icon (Foundations §1.6): a solid alpha mask, tinted like an SF Symbol. */
  icon?: ImageSourcePropType;
  /** SF Symbol icon, for when no custom asset exists yet. */
  sfSymbol?: SFSymbol;
  /** Required when the option renders as an icon (Rule 55). */
  accessibilityLabel?: string;
}

interface SegmentedToggleProps<T extends string> {
  onChange: (value: T) => void;
  options: SegmentedToggleOption<T>[];
  testID?: string;
  value: T;
}

const ICON_SIZE = 20;

const useStyles = makeStyles((theme) => ({
  icon: {
    height: ICON_SIZE,
    width: ICON_SIZE,
  },
  label: {
    color: theme.colors['text-secondary'],
    fontSize: fontSizes.footnote,
    fontWeight: fontWeights.semibold,
  },
  labelSelected: {
    color: theme.colors['primary-foreground'],
  },
  segment: {
    alignItems: 'center',
    borderRadius: radii.full,
    justifyContent: 'center',
    minHeight: componentSizes.xl,
  },
  segmentIcon: {
    width: componentSizes.xl,
  },
  segmentLabel: {
    paddingHorizontal: componentSizes.md,
  },
  segmentSelected: {
    backgroundColor: theme.colors.primary,
  },
  track: {
    // componentSizes.xl (44pt) guarantees every segment clears the
    // platform's minimum tap target (Rule 20, 74) — this must never shrink
    // to visually match a neighboring icon button's smaller *visual* size,
    // since IconButton only clears 44pt via hitSlop, not its own frame.
    backgroundColor: theme.colors['muted'],
    borderRadius: radii.full,
    flexDirection: 'row',
    padding: 2,
  },
}));

/**
 * A flat toggle built from our own tokens — no native segmented control, so
 * no OS glass material to fight with. Segments render as text or icons
 * (never both in one toggle) and are always a 44x44pt tap target (Rule 20,
 * 74) regardless of how small the glyph or label is.
 */
export function SegmentedToggle<T extends string>({
  onChange,
  options,
  testID,
  value,
}: SegmentedToggleProps<T>) {
  const themeColors = useThemeColors();
  const styles = useStyles();

  return (
    // A plain container wrapping accessible Pressable children gets
    // flattened out of the iOS accessibility tree — its own testID never
    // surfaces to tools that query that tree (Maestro included), even
    // though the container itself renders fine. Each segment gets its own
    // derived testID below so the toggle stays queryable per-option.
    <View style={styles.track} testID={testID}>
      {options.map((option) => {
        const selected = option.value === value;
        const isIcon = Boolean(option.icon || option.sfSymbol);
        const tintColor = selected
          ? themeColors['primary-foreground']
          : themeColors['text-secondary'];

        return (
          <Pressable
            key={option.value}
            accessibilityLabel={option.accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              isIcon ? styles.segmentIcon : styles.segmentLabel,
              selected && styles.segmentSelected,
            ]}
            testID={testID ? `${testID}-${option.value}` : undefined}
          >
            {option.icon ? (
              <Image
                source={option.icon}
                style={[styles.icon, { tintColor }]}
                resizeMode="contain"
              />
            ) : option.sfSymbol ? (
              <AppIcon name={option.sfSymbol} size={ICON_SIZE} tintColor={tintColor} />
            ) : (
              <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
