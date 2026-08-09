import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { nativeMotionTiming } from '~/services/motion/native-motion';
import { ALL_ROUTE, TIME_ROUTE } from '~/services/navigation/routes';

const EDGE_SIZE = 28;
const COMMIT_DISTANCE = 100;
const COMMIT_VELOCITY = 900;

type Scene = 'all' | 'time';

function sceneFromPathname(pathname: string): Scene | null {
  if (pathname === '/(protected)' || pathname === '/') return 'all';
  if (pathname === '/(protected)/time' || pathname === '/time') return 'time';
  return null;
}

export function RootSceneGesture({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const scene = sceneFromPathname(pathname);
  const progress = useSharedValue(0);
  const direction = useSharedValue(0);
  const startX = useSharedValue(-1);
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    progress.value = 0;
    direction.value = 0;
    startX.value = -1;
    setIsSettling(false);
  }, [direction, pathname, progress]);

  const commitRoute = useCallback(
    (target: Scene) => {
      router.replace(target === 'all' ? ALL_ROUTE : TIME_ROUTE);
      setIsSettling(false);
    },
    [router],
  );

  const gesture = useMemo(() => {
    if (!scene || isSettling) return Gesture.Pan();

    const pan = Gesture.Pan()
      .activeOffsetX([-12, 12])
      .failOffsetY([-18, 18])
      .onTouchesDown((event) => {
        'worklet';
        const touch = event.allTouches[0];
        if (!touch) return;
        const fromAll = scene === 'all';
        const fromEdge = fromAll
          ? touch.absoluteX >= width - EDGE_SIZE
          : touch.absoluteX <= EDGE_SIZE;
        startX.value = fromEdge ? touch.absoluteX : -1;
      })
      .onStart(() => {
        'worklet';
        direction.value = startX.value >= 0 ? (scene === 'all' ? -1 : 1) : 0;
        progress.value = 0;
      })
      .onUpdate((event) => {
        'worklet';
        if (startX.value < 0 || direction.value === 0) return;
        const intendedDistance = event.translationX * direction.value;
        progress.value = Math.max(0, Math.min(1, intendedDistance / width));
      })
      .onFinalize((event) => {
        'worklet';
        if (startX.value < 0 || direction.value === 0) {
          progress.value = withTiming(0, nativeMotionTiming.exit);
          return;
        }
        const intendedDistance = event.translationX * direction.value;
        const intendedVelocity = event.velocityX * direction.value;
        const shouldCommit =
          intendedDistance >= COMMIT_DISTANCE || intendedVelocity >= COMMIT_VELOCITY;
        if (!shouldCommit) {
          progress.value = withTiming(0, nativeMotionTiming.exit);
          direction.value = 0;
          return;
        }
        const target = scene === 'all' ? 'time' : 'all';
        if (reducedMotion) {
          runOnJS(commitRoute)(target);
          return;
        }
        progress.value = withTiming(1, nativeMotionTiming.enter, (finished) => {
          if (finished) runOnJS(commitRoute)(target);
        });
        runOnJS(setIsSettling)(true);
      });

    return pan;
  }, [commitRoute, direction, isSettling, pathname, progress, reducedMotion, scene, startX, width]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: direction.value * progress.value * width * 0.18 }],
  }));
  const previewStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.9,
    transform: [
      {
        translateX: direction.value * width * (1 - progress.value),
      },
    ],
  }));

  if (!scene) return children;

  const adjacentScene = scene === 'all' ? 'Time' : 'All';
  return (
    <GestureDetector gesture={gesture}>
      <View className="flex-1 overflow-hidden" testID={`root-scene-${scene}`}>
        <Reanimated.View className="absolute inset-0 bg-secondary" style={previewStyle}>
          <View className="flex-1 items-center justify-center">
            <Text className="text-title2 text-secondary-foreground">{adjacentScene}</Text>
          </View>
        </Reanimated.View>
        <Reanimated.View className="flex-1" style={contentStyle}>
          {children}
        </Reanimated.View>
      </View>
    </GestureDetector>
  );
}
