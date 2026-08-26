import { Stack } from 'expo-router';

import { NewChatScreen } from '~/components/home/NewChatScreen';
import { NavDrawerMenuButton } from '~/components/navigation/NavDrawerMenuButton';

export default function NewChatRoute() {
  return (
    <>
      <Stack.Screen options={{ headerLeft: () => <NavDrawerMenuButton />, title: '' }} />
      <NewChatScreen />
    </>
  );
}
