import { LinearGradient } from 'expo-linear-gradient'
import { Stack, useRouter } from 'expo-router'
import React, { useCallback } from 'react'
import { Dimensions, Image, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { IntentPill } from '~/components/start/intent-pill'
import { Text } from '~/theme'
import { useIntentSuggestions } from '~/utils/services/intents/use-intent-suggestions'

const { width } = Dimensions.get('window')

export default function StartScreen() {
  const router = useRouter()
  const { suggestions } = useIntentSuggestions()

  const onIntentPress = useCallback(
    (intent: { id: string; seed_prompt?: string }) => {
      router.push({ pathname: '/(drawer)/(tabs)/sherpa', params: { intentId: intent.id, seed: intent.seed_prompt } })
    },
    [router]
  )

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={['#0a0c10', '#0a0c10']} style={styles.background}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBar}>
              <Image source={require('~/assets/icon.png')} style={styles.logo} />
              <Text variant="title" color="white">
                Mindsherpa
              </Text>
              <View style={styles.avatar} />
            </View>

            <Animated.View entering={FadeInDown.springify().stiffness(140)} style={{ gap: 10, marginTop: 18 }}>
              <Text variant="header" color="white">
                Where should we start?
              </Text>
              <Text variant="body" color="white">
                Pick a path or just say it.
              </Text>
            </Animated.View>

            <View style={styles.pills}>
              {suggestions.slice(0, 6).map((intent, index) => (
                <IntentPill key={intent.id} intent={intent} delay={index * 80} onPress={onIntentPress} />
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  )
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 140,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  logo: {
    height: 32,
    width: 32,
    borderRadius: 8,
  },
  avatar: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  pills: {
    marginTop: 18,
    gap: 12,
    width: width - 32,
  },
})
