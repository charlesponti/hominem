import { Stack } from 'expo-router';

export default function InboxStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen dangerouslySingular name="[kind]/[id]" />
    </Stack>
  );
}
