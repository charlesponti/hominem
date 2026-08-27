import { Stack } from 'expo-router';

export default function ChatsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen dangerouslySingular name="[id]" />
    </Stack>
  );
}
