import { LinearTransition } from 'react-native-reanimated';

import { transitionDurations } from '~/components/theme';

export function createLayoutTransition(reducedMotion: boolean) {
  return reducedMotion ? undefined : LinearTransition.duration(transitionDurations[150]);
}

// Spring-based layout transition for the composer's row<->column reflow. Runs
// entirely on the UI thread like the duration-based variant, but a spring
// interpolates position/size continuously instead of a fixed-duration curve —
// this is what makes a position:absolute<->relative flip (row overlay vs
// column normal-flow) read as one continuous motion instead of a snap,
// without any hand-rolled shared-value bookkeeping.
export function createComposerReflowTransition(reducedMotion: boolean) {
  return reducedMotion
    ? undefined
    : LinearTransition.springify().damping(22).stiffness(210).mass(0.6);
}
