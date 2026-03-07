import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { theme } from '~/theme';
import { ApiProvider } from '~/utils/api-provider';
import { useAuth } from '~/utils/auth-provider';

const ProtectedBootstrap = () => (
  <View testID="protected-bootstrap" style={{ flex: 1, backgroundColor: theme.colors.background }} />
)

const DrawerLayout = () => {
  const { authStatus, isSignedIn } = useAuth()

  if (authStatus === 'booting' || !isSignedIn) {
    return <ProtectedBootstrap />
  }

  return (
    <ApiProvider>
      <Stack initialRouteName="(tabs)">
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ApiProvider>
  );
};

export default DrawerLayout;
