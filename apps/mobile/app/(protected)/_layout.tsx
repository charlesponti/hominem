import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { FeatureErrorBoundary } from '~/components/error-boundary';
import { theme } from '~/theme';
import { ApiProvider } from '~/utils/api-provider';
import { useAuth } from '~/utils/auth-provider';

const bootstrapStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
});

const ProtectedBootstrap = () => <View testID="protected-bootstrap" style={bootstrapStyles.root} />;

const DrawerLayout = () => {
  const { authStatus, isSignedIn } = useAuth();

  if (authStatus === 'booting' || !isSignedIn) {
    return <ProtectedBootstrap />;
  }

  return (
    <FeatureErrorBoundary featureName="Protected">
      <ApiProvider>
        <Stack initialRouteName="(tabs)">
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </ApiProvider>
    </FeatureErrorBoundary>
  );
};

export default DrawerLayout;
