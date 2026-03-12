import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

import { Text, makeStyles } from '~/theme';
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion';
import type { IntentSuggestion } from '~/utils/services/intents/use-intent-suggestions';

type IntentPillProps = {
  intent: IntentSuggestion;
  delay?: number;
  onPress: (intent: IntentSuggestion) => void;
};

export const IntentPill = ({ intent, delay = 0, onPress }: IntentPillProps) => {
  const styles = useStyles();
  return (
    <Animated.View
      entering={FadeIn.duration(VOID_MOTION_DURATION_STANDARD).delay(delay)}
      exiting={FadeOut.duration(VOID_MOTION_DURATION_STANDARD)}
      layout={Layout.duration(VOID_MOTION_DURATION_STANDARD)}
    >
      <Pressable
        onPress={() => onPress(intent)}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      >
        {intent.emoji && (
          <View style={styles.emojiCircle}>
            <Text variant="title">{intent.emoji}</Text>
          </View>
        )}
        <Text variant="title" color="foreground">
          {intent.title.toUpperCase()}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm_12,
      backgroundColor: t.colors.muted,
      paddingVertical: t.spacing.sm_12,
      paddingHorizontal: t.spacing.m_16,
      borderRadius: t.borderRadii.sm_6,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
    },
    pressed: {
      opacity: 0.8,
    },
    emojiCircle: {
      height: 36,
      width: 36,
      borderRadius: t.borderRadii.sm_6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.muted,
    },
  }),
);
