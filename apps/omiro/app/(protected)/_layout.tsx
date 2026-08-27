import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { FeatureErrorBoundary } from '~/components/error-boundary/FeatureErrorBoundary';
import { ProtectedRouteFallback } from '~/components/protected/protected-route-fallback';
import { makeStyles, useThemeColor } from '~/components/theme';
import { Button } from '~/components/ui/button';
import { APP_NAME } from '~/constants';
import { useAppLock } from '~/hooks/use-app-lock';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { ApiProvider } from '~/services/api/api-provider';
import { useAuth } from '~/services/auth/auth-provider';
import queryClient from '~/services/query-client';
import t from '~/translations';

const springAnimationConfig = {
  damping: 18,
  mass: 0.8,
  stiffness: 200,
  overshootClamping: false,
};

function ProtectedShell() {
  const [background, textPrimary] = useThemeColor([
    '--color-background',
    '--color-foreground',
  ]) as string[];
  const { isPending, isSignedIn } = useAuth();
  const { isUnlocked, authenticate } = useAppLock();
  const prefersReducedMotion = useReducedMotion();

  const screenOptions = useMemo(
    () =>
      prefersReducedMotion
        ? {
            animation: 'fade' as const,
            gestureEnabled: true,
            gestureDirection: 'horizontal' as const,
          }
        : {
            animation: 'default' as const,
            animationEnabled: true,
            transitionSpec: {
              open: { animation: 'spring', config: springAnimationConfig },
              close: { animation: 'spring', config: springAnimationConfig },
            },
            gestureEnabled: true,
            gestureDirection: 'horizontal' as const,
          },
    [prefersReducedMotion],
  );

  if (isPending) {
    return <ProtectedRouteFallback />;
  }

  if (!isSignedIn) {
    return <View testID="protected-bootstrap" style={styles.bootstrapContainer} />;
  }

  if (!isUnlocked) {
    return (
      <View style={styles.lockScreen}>
        <Text style={styles.appTitle}>{APP_NAME}</Text>
        <Text style={styles.lockMessage}>{t.auth.unlockMessage}</Text>
        <View style={styles.unlockButtonContainer}>
          <Button
            label={t.auth.unlockButton}
            onPress={() => void authenticate()}
            variant="primary"
          />
        </View>
      </View>
    );
  }

  return (
    <FeatureErrorBoundary featureName="Protected">
      <ApiProvider queryClient={queryClient}>
        <View style={styles.container}>
          <Stack
            initialRouteName="index"
            screenOptions={{
              ...screenOptions,
              contentStyle: { backgroundColor: background },
              headerLargeTitle: false,
              headerShadowVisible: false,
              headerTintColor: textPrimary,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="new-chat" />
            <Stack.Screen name="chats" options={{ headerShown: false }} />
            <Stack.Screen name="stream" options={{ headerShown: false }} />
            <Stack.Screen name="notes" options={{ headerShown: false }} />
            <Stack.Screen name="time" options={{ headerShown: false }} />
            <Stack.Screen
              name="settings/index"
              options={{
                presentation: 'formSheet',
                sheetGrabberVisible: true,
                title: 'Settings',
              }}
            />
            <Stack.Screen
              name="enhance-sheet"
              options={{
                headerShown: false,
                presentation: 'formSheet',
                sheetAllowedDetents: 'fitToContents',
                sheetGrabberVisible: true,
              }}
            />
            <Stack.Screen
              name="chat-to-note-sheet"
              options={{
                headerShown: false,
                presentation: 'formSheet',
                sheetGrabberVisible: true,
                sheetAllowedDetents: [0.6, 0.95],
                sheetInitialDetentIndex: 0,
              }}
            />
          </Stack>
        </View>
      </ApiProvider>
    </FeatureErrorBoundary>
  );
}

export default ProtectedShell;

const styles = makeStyles((theme) => ({
  bootstrapContainer: { flex: 1 },
  lockScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  appTitle: { ...theme.typography.title1, color: theme.colors.foreground },
  lockMessage: { ...theme.typography.body, color: theme.colors.mutedForeground },
  unlockButtonContainer: { minWidth: 160 },
  container: { flex: 1 },
}));
