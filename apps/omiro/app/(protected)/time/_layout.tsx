import { Stack } from 'expo-router';

export default function TimeStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[source]/[id]"
        options={{ presentation: 'formSheet', sheetGrabberVisible: true, title: 'Time block' }}
      />
    </Stack>
  );
}
