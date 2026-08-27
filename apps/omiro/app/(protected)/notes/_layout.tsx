import { useTheme } from '@shopify/restyle';
import { Stack } from 'expo-router';

import { createInboxDetailScreenOptions } from '~/components/inbox/inbox-detail-screen-options';

export default function NotesStackLayout() {
  const { background } = useTheme().colors;

  return (
    <Stack screenOptions={{ headerShown: false, headerStyle: { backgroundColor: background } }}>
      <Stack.Screen dangerouslySingular name="[id]" options={createInboxDetailScreenOptions} />
    </Stack>
  );
}
