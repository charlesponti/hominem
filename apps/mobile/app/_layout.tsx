import { ThemeProvider } from '@shopify/restyle';
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
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsReady(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  const shouldBlockForAuth = authStatus === 'booting';

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
