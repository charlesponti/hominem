import { ThemeProvider } from '@shopify/restyle';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootErrorBoundary } from '~/components/error-boundary/root-error-boundary';
import { InputProvider } from '~/components/input/input-context';
import { InputDock } from '~/components/input/input-dock';
import { theme } from '~/theme';
import { ApiProvider } from '~/utils/api-provider';
import { AuthProvider, useAuth } from '~/utils/auth-provider';
import { initObservability } from '~/utils/observability';
import { logError } from '~/utils/error-boundary/log-error';

SplashScreen.preventAutoHideAsync();

function AppBootstrap() {
  return <View testID="app-bootstrap" style={{ flex: 1, backgroundColor: theme.colors.background }} />
}

function InnerRootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { authStatus, isSignedIn } = useAuth();
  const [fontLoadTimedOut, setFontLoadTimedOut] = React.useState(false);

  const [loaded, error] = useFonts({
    'Font Awesome Regular': require('../assets/fonts/icons/fa-regular-400.ttf'),
    'Geist Mono': require('../assets/fonts/GeistMono-Regular.ttf'),
    'Geist Mono Medium': require('../assets/fonts/GeistMono-Medium.ttf'),
    'Geist Mono SemiBold': require('../assets/fonts/GeistMono-SemiBold.ttf'),
    'Plus Jakarta Sans': require('../assets/fonts/Plus_Jakarta_Sans.ttf'),
  });

  useEffect(() => {
    if (loaded || error || fontLoadTimedOut) {
      SplashScreen.hideAsync();
    }
    if (error) {
      console.warn('Failed to load fonts', error);
    }
  }, [loaded, error, fontLoadTimedOut]);

  useEffect(() => {
    if (loaded || error) {
      setFontLoadTimedOut(false);
      return;
    }

    const timeout = setTimeout(() => {
      setFontLoadTimedOut(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [loaded, error]);

  const shouldBlockForAuth = authStatus === 'booting';
  const shouldBlockForFonts = !loaded && !error && !fontLoadTimedOut;

  useEffect(() => {
    if (shouldBlockForAuth) return;

    const inProtectedGroup = segments[0] === '(drawer)';
    if (!isSignedIn && inProtectedGroup) {
      router.replace('/(auth)');
      return;
    }

    if (isSignedIn && !inProtectedGroup) {
      router.replace('/(drawer)/(tabs)/start');
    }
  }, [shouldBlockForAuth, isSignedIn, segments, router]);

  if (shouldBlockForFonts) {
    return <AppBootstrap />;
  }

  if (shouldBlockForAuth) {
    return <AppBootstrap />;
  }

  const showInputDock = isSignedIn && segments[0] === '(drawer)';

  return (
    <RootErrorBoundary onError={(error, errorInfo) => logError(error, errorInfo, { route: segments.join('/') })}>
      <Stack>
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
      {showInputDock ? (
        <InputProvider>
          <InputDock />
        </InputProvider>
      ) : null}
    </RootErrorBoundary>
  );
}

function RootLayout() {
  useEffect(() => {
    initObservability();
  }, []);

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
  );
}

export default RootLayout;
