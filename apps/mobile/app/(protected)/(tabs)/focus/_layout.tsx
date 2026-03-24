import { Stack } from 'expo-router';
import React from 'react';

export default function FocusLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          presentation: 'modal',
          headerTitle: 'Edit Note',
          headerLargeTitle: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: 'transparent' },
        }}
      />
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
