import type { ReactNode } from 'react';
import {
  Pressable,
  Text,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useStyles } from '~/components/theme';

interface ListRowProps {
  accessibilityActions?: AccessibilityActionInfo[];
  accessibilityLabel: string;
  actionTestID?: string;
  // Off for a fluid, whitespace-separated list (e.g. the stream) instead of
  // the default hairline-divided table row.
  divider?: boolean;
  leading?: ReactNode;
  leadingStyle?: StyleProp<ViewStyle>;
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
  onLongPress?: () => void;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  subtitle?: string | null;
  testID?: string;
  title: string;
  titleStyle?: StyleProp<TextStyle>;
  trailing?: ReactNode;
}

export function ListRow({
  accessibilityActions,
  accessibilityLabel,
  actionTestID,
  divider = true,
  leading,
  leadingStyle,
  onAccessibilityAction,
  onLongPress,
  onPress,
  style,
  subtitle,
  testID,
  title,
  titleStyle,
  trailing,
}: ListRowProps) {
  const styles = useStyles((currentTheme) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 56,
      borderBottomWidth: 1,
      borderBottomColor: currentTheme.colors.border,
      paddingHorizontal: 2,
      paddingVertical: 8,
    } satisfies ViewStyle,
    rowFlat: { borderBottomWidth: 0 } satisfies ViewStyle,
    pressed: { backgroundColor: currentTheme.colors.muted } satisfies ViewStyle,
    leading: { width: 24 } satisfies ViewStyle,
    content: { flex: 1, gap: 2, minWidth: 0 } satisfies ViewStyle,
    title: {
      ...currentTheme.textVariants.body,
      color: currentTheme.colors.foreground,
    } satisfies TextStyle,
    subtitle: {
      ...currentTheme.textVariants.caption1,
      color: currentTheme.colors.mutedForeground,
    } satisfies TextStyle,
    trailing: { alignItems: 'center', justifyContent: 'center' } satisfies ViewStyle,
  }));
  return (
    <Pressable
      accessibilityActions={accessibilityActions}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onAccessibilityAction={onAccessibilityAction}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !divider && styles.rowFlat,
        style,
        pressed && styles.pressed,
      ]}
      testID={testID ?? actionTestID}
    >
      {leading ? <View style={[styles.leading, leadingStyle]}>{leading}</View> : null}
      <View style={styles.content}>
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
