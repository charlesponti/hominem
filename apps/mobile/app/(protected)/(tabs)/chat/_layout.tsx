import { Stack } from 'expo-router';

function ChatStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default ChatStack;
