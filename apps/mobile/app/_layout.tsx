import { ThemeProvider } from '@shopify/restyle';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootErrorBoundary } from '~/components/error-boundary/root-error-boundary';
import { theme } from '~/theme';
import { AuthProvider, useAuth } from '~/utils/auth-provider';
import { E2E_TESTING } from '~/utils/constants';
import { logError } from '~/utils/error-boundary/log-error';
import { resolveAuthRedirect } from '~/utils/navigation/auth-route-guard';
import { initObservability } from '~/utils/observability';
import { markStartupPhase } from '~/utils/performance/startup-metrics';

SplashScreen.preventAutoHideAsync();
markStartupPhase('app_start');

function InnerRootLayout() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const { authStatus, isSignedIn, resetAuthForE2E, signOut } = useAuth();
  const hasMarkedShellReady = React.useRef(false);

  useEffect(() => {
    markStartupPhase('root_layout_mounted');

    let hasHidden = false;
    const hide = () => {
      if (hasHidden) {
        return;
      }
      hasHidden = true;
      SplashScreen.hideAsync().catch(() => undefined);
    };

    hide();
    const timeout = setTimeout(hide, 1500);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!hasMarkedShellReady.current && authStatus !== 'booting') {
      markStartupPhase('shell_ready');
      hasMarkedShellReady.current = true;
    }

    const target = resolveAuthRedirect({
      authStatus,
      isSignedIn,
      segments,
    });
    if (target) {
      router.replace(target as RelativePathString);
    }
  }, [authStatus, isSignedIn, segments, router]);

  return (
    <RootErrorBoundary
      onError={(error, errorInfo) => logError(error, errorInfo, { route: segments.join('/') })}
    >
      <Stack>
        <Stack.Screen name="(protected)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
      {E2E_TESTING ? (
        <>
          {authStatus === 'booting' ? (
            <View testID="auth-state-booting" style={styles.e2eIndicator} />
          ) : null}
          {authStatus === 'signed_out' ||
          authStatus === 'otp_requested' ||
          authStatus === 'verifying_otp' ||
          authStatus === 'degraded' ? (
            <View testID="auth-state-signed-out" style={styles.e2eIndicator} />
          ) : null}
          {authStatus === 'signed_in' || authStatus === 'signing_out' ? (
            <View testID="auth-state-signed-in" style={styles.e2eIndicator} />
          ) : null}
          <Pressable
            testID="auth-e2e-reset"
            style={styles.e2eAction}
            onPress={() => {
              void resetAuthForE2E();
            }}
          />
          <Pressable
            testID="auth-e2e-sign-out"
            style={styles.e2eActionAlt}
            onPress={() => {
              void signOut();
            }}
          />
        </>
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
        <GestureHandlerRootView style={rootStyles.gestureRoot}>
          <RootErrorBoundary>
            <AuthProvider>
              <InnerRootLayout />
            </AuthProvider>
          </RootErrorBoundary>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default RootLayout;

const rootStyles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

const styles = StyleSheet.create({
  e2eIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 2,
    height: 2,
    opacity: 0.02,
  },
  e2eAction: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    opacity: 0.02,
  },
  e2eActionAlt: {
    position: 'absolute',
    top: 22,
    right: 2,
    width: 16,
    height: 16,
    opacity: 0.02,
  },
});
