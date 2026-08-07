import type { ReactNode } from 'react';
import { Pressable, type StyleProp, type TextStyle, View } from 'react-native';

import { makeStyles, SCREEN_MARGIN_HORIZONTAL, spacing, Text } from '~/components/theme';

interface StreamItemProps {
  actionTestID?: string;
  accessibilityLabel: string;
  eyebrow?: string;
  leading?: ReactNode;
  onLongPress?: () => void;
  onPress: () => void;
  supportingText?: string | null;
  testID?: string;
  title: string;
  titleStyle?: StyleProp<TextStyle>;
  trailing?: ReactNode;
}

export function StreamItem({
  actionTestID,
  accessibilityLabel,
  eyebrow,
  leading,
  onLongPress,
  onPress,
  supportingText,
  testID,
  title,
  titleStyle,
  trailing,
}: StreamItemProps) {
  const styles = useStyles();

  return (
    <View style={styles.container} testID={testID}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onLongPress={onLongPress}
        onPress={onPress}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        testID={actionTestID}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.copy}>
          {eyebrow ? (
            <Text variant="caption2" color="text-secondary" style={styles.eyebrow}>
              {eyebrow}
            </Text>
          ) : null}
          <Text numberOfLines={2} variant="body" color="text-primary" style={titleStyle}>
            {title}
          </Text>
          {supportingText ? (
            <Text ellipsizeMode="tail" numberOfLines={1} variant="caption1" color="text-secondary">
              {supportingText}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  action: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: theme.streamItem.gap,
    minWidth: 0,
  },
  container: {
    alignItems: 'center',
    borderColor: theme.colors['border-default'],
    borderRadius: theme.streamItem.borderRadius,
    borderBottomWidth: theme.streamItem.borderWidth,
    flexDirection: 'row',
    gap: theme.streamItem.gap,
    marginHorizontal: SCREEN_MARGIN_HORIZONTAL,
    marginBottom: spacing[2],
    minHeight: theme.streamItem.minHeight,
    paddingHorizontal: theme.streamItem.paddingHorizontal,
    paddingVertical: theme.streamItem.paddingVertical,
  },
  copy: {
    flex: 1,
    gap: spacing[1],
    minWidth: 0,
  },
  eyebrow: { letterSpacing: 0.2 },
  leading: {
    alignItems: 'center',
    height: theme.streamItem.iconSize,
    justifyContent: 'center',
    width: theme.streamItem.iconSize,
  },
  pressed: { opacity: 0.6 },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
