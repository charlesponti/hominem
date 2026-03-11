import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { useCallback } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IntentPill } from '~/components/start/intent-pill';
import { AsciiTexture } from '~/components/ui/ascii-texture';
import { Text, theme } from '~/theme';
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion';
import { useIntentSuggestions } from '~/utils/services/intents/use-intent-suggestions';

const { width } = Dimensions.get('window');

export default function StartScreen() {
  const router = useRouter();
  const { suggestions } = useIntentSuggestions();

  const onIntentPress = useCallback(
    (intent: { id: string; seed_prompt?: string }) => {
      router.push({
        pathname: '/(protected)/(tabs)/sherpa' as RelativePathString,
        params: { intentId: intent.id, seed: intent.seed_prompt },
      });
    },
    [router],
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView testID="start-screen" style={styles.background}>
        <AsciiTexture />
        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Image
              source={require('~/assets/icon.png')}
              contentFit="cover"
              style={styles.logo}
            />
            <Text variant="title" color="foreground">
              MINDSHERPA
            </Text>
            <View style={styles.avatar} />
          </View>

          <Animated.View
            entering={FadeIn.duration(VOID_MOTION_DURATION_STANDARD)}
            style={styles.headingBlock}
          >
            <Text variant="header" color="foreground">
              WHERE SHOULD WE START?
            </Text>
            <Text variant="body" color="text-secondary">
              SELECT AN INTENT OR START FREEFORM INPUT.
            </Text>
          </Animated.View>

          <View style={styles.pills}>
            {suggestions.slice(0, 6).map((intent, index) => (
              <IntentPill
                key={intent.id}
                intent={intent}
                delay={index * 80}
                onPress={onIntentPress}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollFlex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: theme.spacing.m_16,
    paddingBottom: 140,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm_12,
  },
  logo: {
    height: 32,
    width: 32,
    borderRadius: theme.borderRadii.sm_6,
  },
  avatar: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.muted,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
  },
  headingBlock: {
    gap: 10,
    marginTop: 18,
  },
  pills: {
    marginTop: 18,
    gap: theme.spacing.sm_12,
    width: width - 32,
  },
});
