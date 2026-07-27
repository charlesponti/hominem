import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as Sentry from '@sentry/react-native';
import { useIsRestoring } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import {
  DefaultTheme,
  SplashScreen,
  Stack,
  ThemeProvider,
  type RelativePathString,
  usePathname,
  useRouter,
  useSegments,
} from 'expo-router';
import { PostHogProvider, type PostHog } from 'posthog-react-native';
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { logError } from '~/components/error-boundary/log-error';
import { RootErrorBoundary } from '~/components/error-boundary/RootErrorBoundary';
import { makeStyles, useThemeColors } from '~/components/theme';
import { E2E_TESTING } from '~/constants';
import { useScreenCapture } from '~/hooks/use-screen-capture';
import { resolveAuthRedirect } from '~/navigation/auth-route-guard';
import { AuthProvider, useAuth } from '~/services/auth/auth-provider';
import { consumeRestoreAttempt, consumeResumeTarget } from '~/services/navigation/launch-state';
import { getContentRoute } from '~/services/navigation/routes';
import { initObservability, isSentryEnabled } from '~/services/observability';
import { POSTHOG_ENABLED, posthog } from '~/services/posthog';
import queryClient from '~/services/query-client';
import { mobilePersistOptions } from '~/services/query-persistence';
import { recordActiveDay } from '~/services/review-prompt/review-prompt';

SplashScreen.preventAutoHideAsync();

const useInnerStyles = makeStyles((t) => ({
  safeArea: {
    flex: 1,
  },
  e2eIndicator: {
    position: 'absolute',
    top: t.spacing.sm,
    left: t.spacing.sm,
    width: 2,
    height: 2,
    opacity: 0.02,
  },
  e2eAction: {
    position: 'absolute',
    top: t.spacing.sm,
    right: t.spacing.sm,
    width: 16,
    height: 16,
    opacity: 0.02,
  },
  e2eActionAlt: {
    position: 'absolute',
    top: t.spacing.xl,
    right: t.spacing.sm,
    width: 16,
    height: 16,
    opacity: 0.02,
  },
}));

const useRootStyles = makeStyles(() => ({
  gestureRoot: {
    flex: 1,
  },
}));

function InnerRootLayout() {
  const styles = useInnerStyles();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments() as string[];
  const segmentKey = segments.join('/');
  const { isPending, isSignedIn, isSigningOut, currentUser, resetAuthForE2E, signOut } = useAuth();
  const isRestoring = useIsRestoring();
  const hasMarkedShellReady = React.useRef(false);
  const lastRedirectSignatureRef = React.useRef<string | null>(null);
  useEffect(() => {
    let hasHidden = false;
    const hide = () => {
      if (hasHidden) {
        return;
      }
      hasHidden = true;
      SplashScreen.hideAsync().catch(() => undefined);
    };

    // Boot resolution decides whether we land on (auth) or (protected); hiding
    // the splash before that resolves flashes the wrong screen. The timeout is
    // a safety net in case boot never settles.
    if (!isPending && !isRestoring) {
      hide();
      return;
    }

    const timeout = setTimeout(hide, 3000);
    return () => clearTimeout(timeout);
  }, [isPending, isRestoring]);

  useEffect(() => {
    if (isSignedIn && currentUser?.id) {
      posthog.identify(currentUser.id, { email: currentUser.email ?? null });
    } else if (!isPending && !isSignedIn) {
      posthog.reset();
    }
  }, [currentUser, isPending, isSignedIn]);

  useEffect(() => {
    if (!hasMarkedShellReady.current && !isPending && !isRestoring) {
      hasMarkedShellReady.current = true;
    }

    const target = resolveAuthRedirect({
      isPending: isPending || isRestoring,
      isSignedIn,
      isSigningOut,
      segments,
    });
    if (!target) {
      lastRedirectSignatureRef.current = null;
      return;
    }

    const redirectSignature = `${segmentKey}->${target}`;
    if (lastRedirectSignatureRef.current === redirectSignature) {
      return;
    }

    lastRedirectSignatureRef.current = redirectSignature;
    if (target) {
      router.replace(target as RelativePathString);
    }
  }, [isPending, isRestoring, isSignedIn, isSigningOut, router, segmentKey, segments]);

  useEffect(() => {
    if (isPending || isRestoring || !isSignedIn || !currentUser?.id) {
      return;
    }

    if (!consumeRestoreAttempt()) {
      return;
    }

    const resumeTarget = consumeResumeTarget();
    if (!resumeTarget) {
      return;
    }

    const target = getContentRoute(resumeTarget.kind, resumeTarget.id);
    if (pathname !== target) {
      router.replace(target);
    }
  }, [currentUser?.id, isPending, isRestoring, isSignedIn, pathname, router]);

  return (
    <RootErrorBoundary
      onError={(error, errorInfo) => logError(error, errorInfo, { route: segments.join('/') })}
    >
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: 'transparent' } }}>
          <Stack.Screen name="(protected)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaView>
      {E2E_TESTING ? (
        <>
          {isPending ? <View testID="auth-state-booting" style={styles.e2eIndicator} /> : null}
          {!isPending && !isSignedIn && !isSigningOut ? (
            <View testID="auth-state-signed-out" style={styles.e2eIndicator} />
          ) : null}
          {isSignedIn || isSigningOut ? (
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
  const rootStyles = useRootStyles();
  const themeColors = useThemeColors();
  useScreenCapture();

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: themeColors['background'],
      border: themeColors['border-default'],
      card: themeColors['background'],
      notification: themeColors.primary,
      primary: themeColors.primary,
      text: themeColors['text-primary'],
    },
  };

  useEffect(() => {
    if (E2E_TESTING) {
      return;
    }

    const cleanup = initObservability();
    posthog.capture('app_health_check', { source: 'root_layout' });
    void recordActiveDay();
    return cleanup;
  }, []);

  const content = (
    <ThemeProvider value={navigationTheme}>
      <PersistQueryClientProvider client={queryClient} persistOptions={mobilePersistOptions}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={rootStyles.gestureRoot}>
            <KeyboardProvider>
              <AuthProvider>
                <BottomSheetModalProvider>
                  <InnerRootLayout />
                </BottomSheetModalProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </PersistQueryClientProvider>
    </ThemeProvider>
  );

  return POSTHOG_ENABLED ? (
    <PostHogProvider client={posthog as PostHog}>{content}</PostHogProvider>
  ) : (
    content
  );
}

export default isSentryEnabled ? Sentry.wrap(RootLayout) : RootLayout;
