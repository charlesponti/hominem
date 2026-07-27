import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useThemeColors } from '~/components/theme';
import {
  createComposerReflowTransition,
  createLayoutTransition,
} from '~/components/theme/animations';
import { nativeShadows, radii, spacing } from '~/components/theme/tokens';
import { useReducedMotion } from '~/hooks/use-reduced-motion';

interface ComposerShellProps {
  input: React.ReactNode;
  toolbar: React.ReactNode;
  accessory?: React.ReactNode;
  inlinePanel?: React.ReactNode;
  errorBanner?: React.ReactNode;
  testID?: string;
  isRecording?: boolean;
  isColumnLayout: boolean;
}

export function ComposerShell({
  input,
  toolbar,
  accessory,
  inlinePanel,
  errorBanner,
  testID,
  isRecording = false,
  isColumnLayout,
}: ComposerShellProps) {
  const styles = useStyles();
  const themeColors = useThemeColors();
  const prefersReducedMotion = useReducedMotion();
  const previousIsColumnLayout = useRef(isColumnLayout);
  const isColumnLayoutTransition = previousIsColumnLayout.current !== isColumnLayout;

  useEffect(() => {
    previousIsColumnLayout.current = isColumnLayout;
  }, [isColumnLayout]);

  // A subtle ambient cue on the card's own edge — distinct from the recording
  // panel's own indicator dot — so the "you're recording" state stays visible
  // in peripheral vision even if you look away from the panel itself.
  const recordingBorderStyle = useAnimatedStyle(() => ({
    borderColor: isRecording
      ? withRepeat(
          withTiming(themeColors.destructive, {
            duration: 900,
            easing: Easing.inOut(Easing.ease),
          }),
          -1,
          true,
        )
      : themeColors['border-default'],
  }));

  return (
    <Animated.View
      style={styles.wrapper}
      testID={testID}
      layout={createLayoutTransition(prefersReducedMotion)}
    >
      {errorBanner ? (
        // Sits outside the surface's own overflow:hidden clipping, directly above it.
        <Animated.View
          style={styles.errorBanner}
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
        >
          {errorBanner}
        </Animated.View>
      ) : null}
      <Animated.View
        style={[
          styles.surface,
          isColumnLayout ? styles.surfaceActive : styles.surfaceIdle,
          recordingBorderStyle,
        ]}
      >
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
        <Animated.View
          style={styles.contentArea}
          layout={createComposerReflowTransition(prefersReducedMotion)}
        >
          {isRecording ? null : <View style={styles.inputRow}>{input}</View>}
          {isColumnLayout && inlinePanel ? (
            <View style={styles.inlinePanel}>{inlinePanel}</View>
          ) : null}
          {/* Recording has its own stop/cancel controls in inlinePanel — the toolbar
              row would otherwise render empty (attach + mic both gated on !isRecording)
              and still claim a full row of vertical space. */}
          {isRecording ? null : (
            // Renders after inputRow so it paints on top when overlaid in row mode.
            // Animate only the position:absolute <-> position:relative mode change.
            // Let normal multiline growth reposition the toolbar immediately; otherwise
            // every new input line replays the spring and makes the buttons bounce.
            <Animated.View
              style={isColumnLayout ? styles.controlsAnchorColumn : styles.controlsAnchorOverlay}
              layout={
                isColumnLayoutTransition
                  ? createComposerReflowTransition(prefersReducedMotion)
                  : undefined
              }
              pointerEvents={isColumnLayout ? 'auto' : 'box-none'}
            >
              {toolbar}
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = makeStyles((theme) => ({
  wrapper: {},
  errorBanner: {
    width: '100%',
    marginBottom: spacing[2],
  },
  surface: {
    boxShadow: nativeShadows.sm,
    borderColor: theme.colors['border-default'],
    borderWidth: 1,
    elevation: 6,
    overflow: 'hidden',
    width: '100%',
  },
  surfaceActive: {
    backgroundColor: theme.colors['background'],
    borderRadius: radii.xl,
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    gap: spacing[1],
  },
  surfaceIdle: {
    backgroundColor: theme.colors['card'],
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  accessory: {
    width: '100%',
  },
  contentArea: {
    width: '100%',
    gap: spacing[1],
  },
  inputRow: {
    width: '100%',
  },
  inlinePanel: {
    width: '100%',
  },
  controlsAnchorColumn: {
    width: '100%',
  },
  controlsAnchorOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
}));
