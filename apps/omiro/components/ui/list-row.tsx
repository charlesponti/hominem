import type { ReactNode } from 'react';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { makeStyles } from '~/components/theme';

interface ListRowProps {
  accessibilityLabel: string;
  actionTestID?: string;
  eyebrow?: string;
  leading?: ReactNode;
  onLongPress?: () => void;
  onPress: () => void;
  subtitle?: string | null;
  testID?: string;
  title: string;
  titleStyle?: StyleProp<TextStyle>;
  trailing?: ReactNode;
}

export function ListRow({
  accessibilityLabel,
  actionTestID,
  eyebrow,
  leading,
  onLongPress,
  onPress,
  subtitle,
  testID,
  title,
  titleStyle,
  trailing,
}: ListRowProps) {
  const styles = useStyles;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID ?? actionTestID}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.content}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text numberOfLines={2} style={[styles.title, titleStyle]}>
          {title}
        </Text>
        {subtitle ? (
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((currentTheme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: currentTheme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
  } satisfies ViewStyle,
  pressed: { backgroundColor: currentTheme.colors.muted } satisfies ViewStyle,
  leading: { alignItems: 'center', justifyContent: 'center', width: 24 } satisfies ViewStyle,
  content: { flex: 1, gap: 2, minWidth: 0 } satisfies ViewStyle,
  eyebrow: {
    ...currentTheme.typography.caption2,
    color: currentTheme.colors.mutedForeground,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  title: {
    ...currentTheme.typography.body,
    color: currentTheme.colors.foreground,
  } satisfies TextStyle,
  subtitle: {
    ...currentTheme.typography.caption1,
    color: currentTheme.colors.mutedForeground,
  } satisfies TextStyle,
  trailing: { alignItems: 'center', justifyContent: 'center' } satisfies ViewStyle,
}));
