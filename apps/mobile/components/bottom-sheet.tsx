import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text, theme } from '~/theme';

const OVERDRAG = 15;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const BottomSheet = ({
  isOpen,
  toggleSheet,
}: {
  isOpen: boolean;
  toggleSheet: () => void;
}) => {
  const offset = useSharedValue(-10);

  const pan = Gesture.Pan()
    .onChange((event) => {
      const offsetDelta = event.changeY + offset.value;
      const clamp = Math.max(-OVERDRAG, offsetDelta);

      offset.value = offsetDelta > 0 ? offsetDelta : withSpring(clamp);
    })
    .onFinalize(() => {
      offset.value = withSpring(-10);
    });

  const translateY = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: offset.value,
      },
    ],
  }));

  useEffect(() => {
    if (isOpen) {
      offset.value = withSpring(0);
    }
  });

  return (
    <View>
      <AnimatedPressable
        onPress={toggleSheet}
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.backdrop}
      />
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.container, translateY]}>
          <Text variant="large" color="black">
            Bottom Sheet
          </Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    // flex: 1,
    height: 500,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    borderRadius: 15,
    paddingTop: 30,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.red,
  },
});
