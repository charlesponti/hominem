import { Stack } from 'expo-router';
import { View } from 'react-native';

import { FeatureErrorBoundary } from '~/components/error-boundary/FeatureErrorBoundary';
import { ProtectedRouteFallback } from '~/components/protected/protected-route-fallback';
import { Text, makeStyles, useThemeColors } from '~/components/theme';
import { Button } from '~/components/ui/button';
import { APP_NAME } from '~/constants';
import { useAppLock } from '~/hooks/use-app-lock';
import { useReducedMotion } from '~/hooks/use-reduced-motion';
import { ApiProvider } from '~/services/api/api-provider';
import { useAuth } from '~/services/auth/auth-provider';
import queryClient from '~/services/query-client';
import t from '~/translations';

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  unlockButtonWrap: {
    minWidth: 160,
  },
}));

function ProtectedShell() {
  const themeColors = useThemeColors();
  const styles = useStyles();
  const { isPending, isSignedIn } = useAuth();
  const { isUnlocked, authenticate } = useAppLock();
  const prefersReducedMotion = useReducedMotion();

  const springAnimationConfig = {
    damping: 18,
    mass: 0.8,
    stiffness: 200,
    overshootClamping: false,
  };

  const screenOptions = prefersReducedMotion
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
      };

  if (isPending) {
    return <ProtectedRouteFallback />;
  }

  if (!isSignedIn) {
    return <View testID="protected-bootstrap" style={styles.root} />;
  }

  if (!isUnlocked) {
    return (
      <View style={styles.centered}>
        <Text variant="title1" color="text-primary">
          {APP_NAME}
        </Text>
        <Text variant="body" color="text-secondary">
          {t.auth.unlockMessage}
        </Text>
        <View style={styles.unlockButtonWrap}>
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
        <View style={styles.root}>
          <Stack
            initialRouteName="index"
            screenOptions={{
              ...screenOptions,
              contentStyle: { backgroundColor: themeColors['background'] },
              headerLargeTitle: false,
              headerShadowVisible: false,
              headerTintColor: themeColors['text-primary'],
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
            <Stack.Screen name="onboarding" options={{ headerShown: true }} />
          </Stack>
        </View>
      </ApiProvider>
    </FeatureErrorBoundary>
  );
}

export default ProtectedShell;
