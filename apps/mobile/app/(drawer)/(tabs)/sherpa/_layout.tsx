import { Stack } from 'expo-router';

function SherpaStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default SherpaStack;
