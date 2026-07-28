import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { createLayoutTransition } from '~/components/theme/animations';
import { useReducedMotion } from '~/hooks/use-reduced-motion';

import { ComposerSurface } from './ComposerSurface';

interface ComposerShellProps {
  actions: ReactNode;
  input: ReactNode;
  accessory?: ReactNode;
  errorBanner?: ReactNode;
  focused: boolean;
  inlinePanel?: ReactNode;
  isRecording?: boolean;
  recordingPanel?: ReactNode;
  testID?: string;
}

export function ComposerShell({
  actions,
  accessory,
  errorBanner,
  focused,
  inlinePanel,
  input,
  isRecording = false,
  recordingPanel,
  testID,
}: ComposerShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const extensions = [errorBanner, accessory, inlinePanel].filter(Boolean);

  return (
    <Animated.View
      layout={createLayoutTransition(prefersReducedMotion)}
      style={{ borderColor: 'red', borderWidth: 2, width: '100%' }}
      testID={testID}
    >
      {extensions.length > 0 ? (
        <Animated.View
          entering={prefersReducedMotion ? undefined : FadeIn.duration(150)}
          exiting={prefersReducedMotion ? undefined : FadeOut.duration(120)}
        >
          {extensions.map((extension, index) => (
            <View key={index} style={{ width: '100%' }}>
              {extension}
            </View>
          ))}
        </Animated.View>
      ) : null}
      <ComposerSurface
        destructive={isRecording}
        focused={focused}
        actions={isRecording ? undefined : actions}
        testID={`${testID ?? 'composer'}-surface`}
      >
        {isRecording ? recordingPanel : input}
      </ComposerSurface>
    </Animated.View>
  );
}
