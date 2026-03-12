import { useEffect, type PropsWithChildren } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';

import { makeStyles } from '~/theme';
import { VOID_EASING_ENTER, VOID_MOTION_ENTER } from '~/theme/motion';

export const FeedbackBlock = ({
  error,
  style,
  children,
}: PropsWithChildren<{
  error?: boolean;
  style?: ViewStyle;
}>) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.98);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER });
    scale.value = withTiming(1, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER });
  }, [opacity, scale]);

  const styles = useStyles();

  if (error) {
    return (
      <Animated.View style={[styles.error, { opacity, transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.info, { opacity, transform: [{ scale }] }, style]}>
      {children}
    </Animated.View>
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    error: {
      gap: t.spacing.xs_4,
      alignItems: 'flex-start',
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.ml_24,
      borderColor: t.colors.destructive,
      borderWidth: 1,
      borderRadius: t.borderRadii.sm_6,
      marginVertical: t.spacing.sm_8,
      backgroundColor: t.colors.background,
    },
    info: {
      gap: t.spacing.xs_4,
      alignItems: 'flex-start',
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.ml_24,
      backgroundColor: t.colors.muted,
      borderColor: t.colors['border-default'],
      borderWidth: 1,
      borderRadius: t.borderRadii.sm_6,
      marginVertical: t.spacing.sm_8,
    },
  }),
);
