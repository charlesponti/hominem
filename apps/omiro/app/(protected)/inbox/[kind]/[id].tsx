import { Redirect, useLocalSearchParams } from 'expo-router';

import { ChatDetailScreen } from '~/components/inbox/ChatDetailScreen';
import { NoteDetailScreen } from '~/components/inbox/NoteDetailScreen';
import { HOME_ROUTE } from '~/services/navigation/routes';

export default function InboxDetailRoute() {
  const { kind, id } = useLocalSearchParams<{ kind?: string; id?: string }>();

  if (kind === 'chat') {
    return id ? <ChatDetailScreen id={id} /> : <Redirect href={HOME_ROUTE} />;
  }

  if (kind !== 'note') {
    return <Redirect href={HOME_ROUTE} />;
  }

  return <NoteDetailScreen />;
}
