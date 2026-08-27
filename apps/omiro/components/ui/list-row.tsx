import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { theme } from '~/components/theme';

interface ListRowProps {
  accessibilityLabel: string;
  actionTestID?: string;
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
  leading,
  onLongPress,
  onPress,
  subtitle,
  testID,
  title,
  titleStyle,
  trailing,
}: ListRowProps) {
  const styles = listRowStyles;
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

const listRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 2,
    paddingVertical: 8,
  } satisfies ViewStyle,
  pressed: { backgroundColor: theme.colors.muted } satisfies ViewStyle,
  leading: { alignItems: 'center', justifyContent: 'center', width: 24 } satisfies ViewStyle,
  content: { flex: 1, gap: 2, minWidth: 0 } satisfies ViewStyle,
  title: {
    ...theme.typography.body,
    color: theme.colors.foreground,
  } satisfies TextStyle,
  subtitle: {
    ...theme.typography.caption1,
    color: theme.colors.mutedForeground,
  } satisfies TextStyle,
  trailing: { alignItems: 'center', justifyContent: 'center' } satisfies ViewStyle,
});
