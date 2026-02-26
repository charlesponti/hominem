import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '~/utils/auth-provider';

const DrawerLayout = () => {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Stack initialRouteName="(tabs)">
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
};

export default DrawerLayout;
