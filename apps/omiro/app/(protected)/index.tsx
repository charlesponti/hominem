import { Stack } from 'expo-router';

import { ChatEntryScreen } from '~/components/home/ChatEntryScreen';
import { NavDrawerMenuButton } from '~/components/navigation/NavDrawerMenuButton';

export default function HomeRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerLargeTitle: false,
          headerLeft: () => <NavDrawerMenuButton />,
        }}
      />
      <ChatEntryScreen />
    </>
  );
}
