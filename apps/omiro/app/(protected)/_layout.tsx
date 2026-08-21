import { Stack } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native';

import { FeatureErrorBoundary } from '~/components/error-boundary/FeatureErrorBoundary';
import { ProtectedRouteFallback } from '~/components/protected/protected-route-fallback';
import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';
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
    return <View testID="protected-bootstrap" style={styles.s0} />;
  }

  if (!isUnlocked) {
    return (
      <View style={styles.s1}>
        <Text style={styles.s2}>{APP_NAME}</Text>
        <Text style={styles.s3}>{t.auth.unlockMessage}</Text>
        <View style={styles.s4}>
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
        <View style={styles.s5}>
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
            <Stack.Screen name="inbox" options={{ headerShown: false }} />
            <Stack.Screen name="time" options={{ headerShown: false }} />
            <Stack.Screen
              name="settings/index"
              options={{
                presentation: 'formSheet',
                sheetGrabberVisible: true,
                title: 'Settings',
              }}
            />
            <Stack.Screen name="settings/archived-chats" options={{ title: 'Archived Chats' }} />
            <Stack.Screen
              name="enhance-sheet"
              options={{
                headerShown: false,
                presentation: 'formSheet',
                sheetAllowedDetents: 'fitToContents',
                sheetGrabberVisible: true,
              }}
            />
            <Stack.Screen name="onboarding" options={{ headerShown: true }} />
            <Stack.Screen name="dev/ui-lab" options={{ title: 'UI Lab' }} />
          </Stack>
        </View>
      </ApiProvider>
    </FeatureErrorBoundary>
  );
}

export default ProtectedShell;

const styles = makeStyles((theme) => ({
  s0: { flex: 1 },
  s1: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  s2: { ...theme.typography.title1, color: theme.colors.foreground },
  s3: { ...theme.typography.body, color: theme.colors.mutedForeground },
  s4: { minWidth: 160 },
  s5: { flex: 1 },
}));
