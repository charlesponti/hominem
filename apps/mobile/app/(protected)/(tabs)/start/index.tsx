import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { useCallback } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IntentPill } from '~/components/start/intent-pill';
import { AsciiTexture } from '~/components/ui/ascii-texture';
import { Text, makeStyles } from '~/theme';
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion';
import { useIntentSuggestions } from '~/utils/services/intents/use-intent-suggestions';

const { width } = Dimensions.get('window');

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    background: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    scrollFlex: {
      flex: 1,
    },
    container: {
      paddingHorizontal: t.spacing.m_16,
      paddingBottom: t.spacing.xl_64,
      gap: t.spacing.m_16,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: t.spacing.sm_12,
    },
    logo: {
      height: 32,
      width: 32,
      borderRadius: t.borderRadii.sm_6,
    },
    avatar: {
      height: 34,
      width: 34,
      borderRadius: 17, // special: half of width for circular avatar
      backgroundColor: t.colors.muted,
      borderWidth: 1,
      borderColor: t.colors['border-default'],
    },
    headingBlock: {
      gap: t.spacing.sm_12,
      marginTop: t.spacing.m_16,
    },
    pills: {
      marginTop: t.spacing.m_16,
      gap: t.spacing.sm_12,
      width: width - t.spacing.l_32,
    },
  }),
);

export default function StartScreen() {
  const styles = useStyles();
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
            <Image source={require('~/assets/icon.png')} contentFit="cover" style={styles.logo} />
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
