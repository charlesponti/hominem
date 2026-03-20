import { Stack } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { FeatureErrorBoundary } from '~/components/error-boundary';
import { InputProvider } from '~/components/input/input-context';
import { MobileComposer } from '~/components/input/mobile-composer';
import { MobileWorkspaceProvider } from '~/components/workspace/mobile-workspace-context';
import { useAppLock } from '~/lib/use-app-lock';
import { Text, theme } from '~/theme';
import { ApiProvider } from '~/utils/api-provider';
import { useAuth } from '~/utils/auth-provider';
import queryClient from '~/utils/query-client';

const bootstrapStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
});

const ProtectedBootstrap = () => <View testID="protected-bootstrap" style={bootstrapStyles.root} />;

const LockScreen = ({ onUnlock }: { onUnlock: () => void }) => (
  <View style={lockStyles.container}>
    <Text variant="header" color="foreground">Hakumi</Text>
    <Text variant="body" color="text-secondary">Locked</Text>
    <Pressable onPress={onUnlock} style={lockStyles.button}>
      <Text variant="body" color="foreground">Unlock with Face ID</Text>
    </Pressable>
  </View>
);

const lockStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.m_16,
  },
  button: {
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    borderRadius: theme.borderRadii.md_10,
    paddingHorizontal: theme.spacing.m_16,
    paddingVertical: theme.spacing.sm_8,
    marginTop: theme.spacing.m_16,
  },
});

const DrawerLayout = () => {
  const { authStatus, isSignedIn } = useAuth();
  const { isUnlocked, authenticate } = useAppLock();

  if (authStatus === 'booting' || !isSignedIn) {
    return <ProtectedBootstrap />;
  }

  if (!isUnlocked) {
    return <LockScreen onUnlock={() => void authenticate()} />;
  }

  return (
    <FeatureErrorBoundary featureName="Protected">
      <ApiProvider queryClient={queryClient}>
        <MobileWorkspaceProvider>
          <InputProvider>
            <View style={bootstrapStyles.root}>
              <View style={styles.stackContainer}>
                <Stack initialRouteName="(tabs)">
                  <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
              </View>
              <MobileComposer />
            </View>
          </InputProvider>
        </MobileWorkspaceProvider>
      </ApiProvider>
    </FeatureErrorBoundary>
  );
};

export default DrawerLayout;

const styles = StyleSheet.create({
  stackContainer: {
    flex: 1,
  },
});
