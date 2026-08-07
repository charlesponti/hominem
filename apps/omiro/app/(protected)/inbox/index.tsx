import { Stack, useIsFocused } from 'expo-router';

import { InboxScreen } from '~/components/inbox/InboxScreen';
import { NavDrawerMenuButton } from '~/components/navigation/NavDrawerMenuButton';

export default function InboxRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLargeTitle: false,
          headerLeft: () => <NavDrawerMenuButton />,
          title: 'Inbox',
        }}
      />
      <InboxScreen isFocused={useIsFocused()} />
    </>
  );
}
