import * as Sentry from '@sentry/react-native'
import { ThemeProvider } from '@shopify/restyle'
import { useFonts } from 'expo-font'
import { Slot, SplashScreen, Stack, useRouter, useSegments } from 'expo-router'
import React, { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { InputDock } from '~/components/input/input-dock'
import { InputProvider } from '~/components/input/input-context'
import { theme } from '~/theme'
import { ApiProvider } from '~/utils/api-provider'
import { AuthProvider, useAuth } from '~/utils/auth-provider'
import { initObservability } from '~/utils/observability'

SplashScreen.preventAutoHideAsync()

function InnerRootLayout() {
  const router = useRouter()
  const segments = useSegments()
  const { isLoadingAuth, isSignedIn } = useAuth()

  const [loaded, error] = useFonts({
    'Font Awesome Regular': require('../assets/fonts/icons/fa-regular-400.ttf'),
    'Geist Mono': require('../assets/fonts/GeistMono-Regular.ttf'),
    'Geist Mono Medium': require('../assets/fonts/GeistMono-Medium.ttf'),
    'Geist Mono SemiBold': require('../assets/fonts/GeistMono-SemiBold.ttf'),
    'Plus Jakarta Sans': require('../assets/fonts/Plus_Jakarta_Sans.ttf'),
  })

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync()
    }
    if (error) {
      console.warn('Failed to load fonts', error)
    }
  }, [loaded, error])

  useEffect(() => {
    if (isLoadingAuth) return

    const inProtectedGroup = segments[0] === '(drawer)'
    if (!isSignedIn && inProtectedGroup) {
      router.replace('/(auth)')
      return
    }

    if (isSignedIn && !inProtectedGroup) {
      router.replace('/(drawer)/(tabs)/start')
    }
  }, [isLoadingAuth, isSignedIn, segments, router])

  if (isLoadingAuth) {
    return <Slot />
  }

  const showInputDock = isSignedIn && segments[0] === '(drawer)'

  return (
    <>
      <Stack>
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
      {showInputDock ? (
        <InputProvider>
          <InputDock />
        </InputProvider>
      ) : null}
    </>
  )
}

function RootLayout() {
  useEffect(() => {
    initObservability()
  }, [])

  return (
    <ThemeProvider theme={theme}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <AuthProvider>
            <ApiProvider>
              <InnerRootLayout />
            </ApiProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  )
}

export default Sentry.withErrorBoundary(RootLayout, { showDialog: true })
