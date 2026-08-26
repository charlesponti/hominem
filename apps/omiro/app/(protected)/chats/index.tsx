import { Stack, useRouter } from 'expo-router';

import { ChatsScreen } from '~/components/chat/ChatsScreen';
import { NavDrawerMenuButton } from '~/components/navigation/NavDrawerMenuButton';
import { NEW_CHAT_ROUTE } from '~/services/navigation/routes';

export default function ChatsRoute() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <NavDrawerMenuButton />,
          headerShown: true,
          title: 'Chats',
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="New chat"
          icon="square.and.pencil"
          onPress={() => router.push(NEW_CHAT_ROUTE)}
        />
      </Stack.Toolbar>
      <ChatsScreen />
    </>
  );
}
