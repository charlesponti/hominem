import { Stack } from 'expo-router';

export default function InboxStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="[kind]/[id]"
        getId={({ params }) => (params?.id != null ? String(params.id) : undefined)}
      />
    </Stack>
  );
}
