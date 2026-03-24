import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, Text } from '~/theme';
import {
  VOID_EASING_ENTER,
  VOID_EASING_EXIT,
  VOID_ENTER_TRANSLATE_Y,
  VOID_EXIT_TRANSLATE_Y,
  VOID_MOTION_ENTER,
  VOID_MOTION_EXIT,
} from '~/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const BottomSheet = ({
  isOpen,
  toggleSheet,
}: {
  isOpen: boolean;
  toggleSheet: () => void;
}) => {
  const styles = useStyles();
  const [isVisible, setIsVisible] = useState(isOpen);
  const offset = useSharedValue<number>(VOID_ENTER_TRANSLATE_Y);
  const opacity = useSharedValue<number>(0);

  useAnimatedReaction(
    () => isOpen,
    (current, prev) => {
      'worklet';
      if (current === prev) return;
      if (current) {
        setIsVisible(true);
        offset.value = withTiming(0, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER });
        opacity.value = withTiming(1, { duration: VOID_MOTION_ENTER, easing: VOID_EASING_ENTER });
      } else {
        offset.value = withTiming(VOID_EXIT_TRANSLATE_Y, {
          duration: VOID_MOTION_EXIT,
          easing: VOID_EASING_EXIT,
        });
        opacity.value = withTiming(
          0,
          { duration: VOID_MOTION_EXIT, easing: VOID_EASING_EXIT },
          () => {
            setIsVisible(false);
          },
        );
      }
    },
  );

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    opacity: opacity.value,
  }));

  if (!isVisible) return null;

  return (
    <View style={styles.root}>
      <AnimatedPressable onPress={toggleSheet} style={[styles.backdrop, { opacity }]} />
      <Animated.View style={[styles.container, containerStyle]}>
        <Text variant="title" color="foreground">
          BOTTOM SHEET
        </Text>
      </Animated.View>
    </View>
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: t.colors.black,
      opacity: 0.8,
    },
    container: {
      height: 420,
      borderTopLeftRadius: t.borderRadii.md,
      borderTopRightRadius: t.borderRadii.md,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
      paddingTop: t.spacing.ml_24,
      paddingHorizontal: t.spacing.m_16,
      backgroundColor: t.colors.background,
    },
  }),
);
