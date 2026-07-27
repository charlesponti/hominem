import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { makeStyles, spacing } from '~/components/theme';
import { createLayoutTransition } from '~/components/theme/animations';
import { useReducedMotion } from '~/hooks/use-reduced-motion';

import { ComposerSurface } from './ComposerSurface';

interface ComposerShellProps {
  input: ReactNode;
  leading: ReactNode;
  trailing: ReactNode;
  accessory?: ReactNode;
  errorBanner?: ReactNode;
  focused: boolean;
  inlinePanel?: ReactNode;
  isRecording?: boolean;
  recordingPanel?: ReactNode;
  secondaryActions?: ReactNode;
  testID?: string;
}

export function ComposerShell({
  accessory,
  errorBanner,
  focused,
  inlinePanel,
  input,
  isRecording = false,
  leading,
  recordingPanel,
  secondaryActions,
  testID,
  trailing,
}: ComposerShellProps) {
  const styles = useStyles();
  const prefersReducedMotion = useReducedMotion();
  const extensions = [errorBanner, accessory, inlinePanel].filter(Boolean);

  return (
    <Animated.View
      layout={createLayoutTransition(prefersReducedMotion)}
      style={styles.wrapper}
      testID={testID}
    >
      {extensions.length > 0 ? (
        <Animated.View
          entering={prefersReducedMotion ? undefined : FadeIn.duration(150)}
          exiting={prefersReducedMotion ? undefined : FadeOut.duration(120)}
          style={styles.extensions}
        >
          {extensions.map((extension, index) => (
            <View key={index} style={styles.extension}>
              {extension}
            </View>
          ))}
        </Animated.View>
      ) : null}
      <ComposerSurface
        destructive={isRecording}
        focused={focused}
        leading={isRecording ? undefined : leading}
        secondaryActions={isRecording ? undefined : secondaryActions}
        testID={`${testID ?? 'composer'}-surface`}
        trailing={isRecording ? undefined : trailing}
      >
        {isRecording ? recordingPanel : input}
      </ComposerSurface>
    </Animated.View>
  );
}

const useStyles = makeStyles(() => ({
  extension: { width: '100%' },
  extensions: { gap: spacing[2] },
  wrapper: { gap: spacing[2], width: '100%' },
}));
