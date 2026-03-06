import { Stack } from 'expo-router';
import React from 'react';

const DrawerLayout = () => {
  return (
    <Stack initialRouteName="(tabs)">
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
};

export default DrawerLayout;
