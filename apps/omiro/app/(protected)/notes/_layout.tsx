import { Stack } from 'expo-router';

export default function NotesStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen dangerouslySingular name="[id]" />
    </Stack>
  );
}
