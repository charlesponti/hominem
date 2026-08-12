import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import AppIcon from '~/components/ui/icon';
import { useReducedMotion } from '~/hooks/use-reduced-motion';

import type { ComposerEntryKind } from './composer.types';

const SEGMENT_SIZE = 32;
// Matches on-screen movement per the app's motion guidelines (--ease-in-out).
const MOVE_EASING = Easing.bezier(0.77, 0, 0.175, 1);

interface ComposerKindToggleProps {
  selected: ComposerEntryKind;
  onSelect: (kind: ComposerEntryKind) => void;
}

const options: { kind: ComposerEntryKind; label: string; icon: string; iconFilled: string }[] = [
  {
    kind: 'chat',
    label: 'Conversation',
    icon: 'bubble.left.and.bubble.right',
    iconFilled: 'bubble.left.and.bubble.right.fill',
  },
  { kind: 'note', label: 'Document', icon: 'doc.text', iconFilled: 'doc.text.fill' },
];

// A single mutually-exclusive control (not two independent buttons) so the
// chat/note choice reads as one state with two positions, the same way an
// iOS segmented control does. The thumb sliding between positions is what
// makes switching legible -- see ComposerKindToggle in the /animate skill
// output for the reasoning.
export function ComposerKindToggle({ selected, onSelect }: ComposerKindToggleProps) {
  const [primary, mutedForeground, muted] = useCSSVariable([
    '--color-primary',
    '--color-muted-foreground',
    '--color-muted',
  ]) as string[];
  const reducedMotion = useReducedMotion();
  const selectedIndex = options.findIndex((option) => option.kind === selected);
  const progress = useSharedValue(selectedIndex);

  useEffect(() => {
    progress.value = reducedMotion
      ? selectedIndex
      : withTiming(selectedIndex, { duration: 200, easing: MOVE_EASING });
  }, [selectedIndex, reducedMotion, progress]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * SEGMENT_SIZE }],
  }));

  return (
    <View
      className="flex-row items-center"
      style={{ backgroundColor: muted, borderRadius: 999 }}
      testID="composer-kind-control"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            backgroundColor: primary,
            borderRadius: 999,
            height: SEGMENT_SIZE,
            left: 0,
            opacity: 0.15,
            position: 'absolute',
            top: 0,
            width: SEGMENT_SIZE,
          },
          thumbStyle,
        ]}
      />
      {options.map((option) => {
        const isSelected = option.kind === selected;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={option.kind}
            onPress={() => onSelect(option.kind)}
            style={{
              alignItems: 'center',
              height: SEGMENT_SIZE,
              justifyContent: 'center',
              width: SEGMENT_SIZE,
            }}
            testID={`composer-kind-${option.kind}`}
          >
            <AppIcon
              name={(isSelected ? option.iconFilled : option.icon) as never}
              size={18}
              tintColor={isSelected ? primary : mutedForeground}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
