import { Redirect, Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { ChatScreen } from '~/components/inbox/ChatScreen';
import { NoteScreen } from '~/components/inbox/NoteScreen';
import { ALL_ROUTE } from '~/services/navigation/routes';

export default function InboxDetailRoute() {
  const { kind, id } = useLocalSearchParams<{ kind?: string; id?: string }>();

  if (kind === 'chat') {
    return id ? (
      <InboxDetailChrome>
        <ChatScreen id={id} />
      </InboxDetailChrome>
    ) : (
      <Redirect href={ALL_ROUTE} />
    );
  }

  if (kind !== 'note') {
    return <Redirect href={ALL_ROUTE} />;
  }

  return (
    <InboxDetailChrome>
      <NoteScreen />
    </InboxDetailChrome>
  );
}

function InboxDetailChrome({ children }: { children: ReactNode }) {
  const navigation = useNavigation();
  const router = useRouter();
  const canGoBack = navigation.canGoBack();

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      {canGoBack ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button icon="chevron.left" onPress={() => router.replace(ALL_ROUTE)}>
            Inbox
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      {children}
    </>
  );
}
