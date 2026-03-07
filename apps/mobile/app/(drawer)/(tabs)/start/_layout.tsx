import { Stack } from 'expo-router';

function StartStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default StartStack;
