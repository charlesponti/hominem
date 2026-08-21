import type { EntryAnimationsValues, ExitAnimationsValues } from 'react-native-reanimated';
import Animated, { Easing, FadeIn, FadeOut, withSequence, withTiming } from 'react-native-reanimated';

import { InlineEnhanceTray } from '~/components/ai/InlineEnhanceTray';
import { transitionDurations } from '~/components/theme';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import type { useInlineEnhance } from '~/services/ai';

interface ComposerEnhancePanelProps {
  visible: boolean;
  enhance: ReturnType<typeof useInlineEnhance>;
  getMessage: () => string;
  setMessage: (message: string) => void;
}

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Grows/shrinks the tray's own measured height (targetHeight/currentHeight,
// supplied by Reanimated) instead of translating or plain-fading -- so the
// pop is entirely the panel's own box animating between 0 and its natural
// height. Nothing slides past its bounds, so it can't overlap neighboring
// siblings or bleed past the card's edge mid-transition. A brief overshoot
// past the target height (then settling back) is what reads as a "pop"
// instead of a flat accordion slide.
function expandIn(values: EntryAnimationsValues) {
  'worklet';
  const target = values.targetHeight;
  return {
    initialValues: { height: 0, opacity: 0 },
    animations: {
      height: withSequence(
        withTiming(target * 1.06, { duration: transitionDurations[150], easing: EASE_OUT }),
        withTiming(target, { duration: 80, easing: EASE_OUT }),
      ),
      opacity: withTiming(1, { duration: transitionDurations[150], easing: EASE_OUT }),
    },
  };
}

function collapseOut(values: ExitAnimationsValues) {
  'worklet';
  return {
    initialValues: { height: values.currentHeight, opacity: 1 },
    animations: {
      height: withTiming(0, { duration: transitionDurations[150], easing: EASE_OUT }),
      opacity: withTiming(0, { duration: transitionDurations[100], easing: EASE_OUT }),
    },
  };
}

// Owns the inline-enhance tray's visibility, enter/exit motion, and the
// runEnhance wiring (preset select vs. custom-instruction confirm) so
// Composer.tsx only has to decide *when* this is on screen, not how its
// pieces talk to each other.
export function ComposerEnhancePanel({
  visible,
  enhance,
  getMessage,
  setMessage,
}: ComposerEnhancePanelProps) {
  const prefersReducedMotion = useReducedMotion();

  if (!visible) {
    return null;
  }

  const entering = prefersReducedMotion ? FadeIn.duration(transitionDurations[150]) : expandIn;
  const exiting = prefersReducedMotion ? FadeOut.duration(transitionDurations[100]) : collapseOut;

  return (
    <Animated.View entering={entering} exiting={exiting} style={{ overflow: 'hidden' }}>
      <InlineEnhanceTray
        instruction={enhance.enhanceInstruction}
        onInstructionChange={enhance.setEnhanceInstruction}
        onPresetSelect={(instruction) =>
          void enhance.runEnhance({ instruction, text: getMessage(), onEnhanced: setMessage })
        }
        onCancel={enhance.closeEnhance}
        onConfirm={() => void enhance.runEnhance({ text: getMessage(), onEnhanced: setMessage })}
        isEnhancing={enhance.isEnhancing}
        error={enhance.enhanceError}
      />
    </Animated.View>
  );
}
