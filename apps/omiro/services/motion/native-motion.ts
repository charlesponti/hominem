import { nativeMotion } from '@ponti-studios/ui/native';
import type { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';
import { Easing } from 'react-native-reanimated';

const portableMotion =
  nativeMotion ??
  ({
    distance: { rowEnter: '0.5rem', sceneReveal: '2rem' },
    duration: { deliberate: '500ms', quick: '150ms', standard: '300ms' },
    easing: {
      enter: [0, 0, 0.2, 1],
      exit: [0.4, 0, 1, 1],
      inOut: [0.4, 0, 0.2, 1],
    },
    interruption: { policy: 'cancel-and-settle' },
    reducedMotion: { policy: 'replace-transform-with-opacity' },
  } as const);

function milliseconds(value: string) {
  return Number.parseFloat(value);
}

function pixels(value: string) {
  const amount = Number.parseFloat(value);
  return value.endsWith('rem') ? amount * 16 : amount;
}

function cubicBezier(value: readonly number[]) {
  return Easing.bezier(value[0], value[1], value[2], value[3]);
}

export const nativeMotionContracts = {
  duration: {
    quick: milliseconds(portableMotion.duration.quick),
    standard: milliseconds(portableMotion.duration.standard),
    deliberate: milliseconds(portableMotion.duration.deliberate),
  },
  distance: {
    rowEnter: pixels(portableMotion.distance.rowEnter),
    sceneReveal: pixels(portableMotion.distance.sceneReveal),
  },
  easing: {
    enter: cubicBezier(portableMotion.easing.enter),
    exit: cubicBezier(portableMotion.easing.exit),
    inOut: cubicBezier(portableMotion.easing.inOut),
  },
  interruption: portableMotion.interruption.policy,
  reducedMotion: portableMotion.reducedMotion.policy,
} as const;

export const nativeMotionTiming = {
  enter: {
    duration: nativeMotionContracts.duration.standard,
    easing: nativeMotionContracts.easing.enter,
  } satisfies WithTimingConfig,
  exit: {
    duration: nativeMotionContracts.duration.quick,
    easing: nativeMotionContracts.easing.exit,
  } satisfies WithTimingConfig,
};

export const nativeMotionSpring = {
  damping: 18,
  mass: 0.8,
  stiffness: 200,
  overshootClamping: false,
} satisfies WithSpringConfig;
