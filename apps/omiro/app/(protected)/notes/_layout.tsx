import { Stack } from 'expo-router';

import { createInboxDetailScreenOptions } from '~/components/inbox/inbox-detail-screen-options';
import { useThemeColor } from '~/components/theme';

export default function NotesStackLayout() {
  const [background] = useThemeColor(['--color-background']) as string[];

  return (
    <Stack screenOptions={{ headerShown: false, headerStyle: { backgroundColor: background } }}>
      <Stack.Screen dangerouslySingular name="[id]" options={createInboxDetailScreenOptions} />
    </Stack>
  );
}
