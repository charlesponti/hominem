import '../global.css';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as Sentry from '@sentry/react-native';
import { useIsRestoring } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import {
  DefaultTheme,
  SplashScreen,
  Stack,
  ThemeProvider,
  usePathname,
  useRouter,
  useSegments,
  type RelativePathString,
} from 'expo-router';
import { PostHogProvider, type PostHog } from 'posthog-react-native';
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useCSSVariable, withUniwind } from 'uniwind';

import { logError } from '~/components/error-boundary/log-error';
import { RootErrorBoundary } from '~/components/error-boundary/RootErrorBoundary';
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

// react-native-safe-area-context isn't one of the packages uniwind's Metro
// plugin auto-patches for className support (only "react-native" itself
// is), so this component needs the withUniwind HOC applied manually.
const UniwindSafeAreaView = withUniwind(SafeAreaView);

const e2eIndicatorClass = 'absolute top-2 left-2 w-0.5 h-0.5 opacity-[0.02]';
const e2eActionClass = 'absolute top-2 right-2 w-4 h-4 opacity-[0.02]';
const e2eActionAltClass = 'absolute top-6 right-2 w-4 h-4 opacity-[0.02]';

function InnerRootLayout() {
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
      <UniwindSafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: 'transparent' } }}>
          <Stack.Screen name="(protected)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </UniwindSafeAreaView>
      {E2E_TESTING ? (
        <>
          {isPending ? <View testID="auth-state-booting" className={e2eIndicatorClass} /> : null}
          {!isPending && !isSignedIn && !isSigningOut ? (
            <View testID="auth-state-signed-out" className={e2eIndicatorClass} />
          ) : null}
          {isSignedIn || isSigningOut ? (
            <View testID="auth-state-signed-in" className={e2eIndicatorClass} />
          ) : null}
          <Pressable
            testID="auth-e2e-reset"
            className={e2eActionClass}
            onPress={() => {
              void resetAuthForE2E();
            }}
          />
          <Pressable
            testID="auth-e2e-sign-out"
            className={e2eActionAltClass}
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
  useScreenCapture();

  const [background, border, card, notification, primary, text] = useCSSVariable([
    '--color-background',
    '--color-border',
    '--color-background',
    '--color-primary',
    '--color-primary',
    '--color-foreground',
  ]) as string[];

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background,
      border,
      card,
      notification,
      primary,
      text,
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
          <GestureHandlerRootView style={{ flex: 1 }}>
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
