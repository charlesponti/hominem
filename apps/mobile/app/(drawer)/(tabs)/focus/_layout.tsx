import { Stack } from 'expo-router';
import React from 'react';

export default function FocusLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ presentation: 'modal', headerShown: false }} />
      <Stack.Screen
        name="insights"
        options={{
          presentation: 'formSheet',
          headerTitle: 'Focus rituals',
          sheetAllowedDetents: [0.41, 0.61],
          sheetGrabberVisible: true,
        }}
      />
    </Stack>
  );
}
