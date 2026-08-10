import { Redirect, Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { ChatDetailScreen } from '~/components/inbox/ChatDetailScreen';
import { NoteDetailScreen } from '~/components/inbox/NoteDetailScreen';
import { HOME_ROUTE } from '~/services/navigation/routes';

export default function InboxDetailRoute() {
  const { kind, id } = useLocalSearchParams<{ kind?: string; id?: string }>();

  if (kind === 'chat') {
    return id ? (
      <InboxDetailChrome>
        <ChatDetailScreen id={id} />
      </InboxDetailChrome>
    ) : (
      <Redirect href={HOME_ROUTE} />
    );
  }

  if (kind !== 'note') {
    return <Redirect href={HOME_ROUTE} />;
  }

  return (
    <InboxDetailChrome>
      <NoteDetailScreen />
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
          <Stack.Toolbar.Button icon="chevron.left" onPress={() => router.replace(HOME_ROUTE)}>
            Inbox
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}
      {children}
    </>
  );
}
