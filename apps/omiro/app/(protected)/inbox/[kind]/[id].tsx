import { Redirect, useLocalSearchParams } from 'expo-router';

import { ChatDetailScreen } from '~/components/inbox/ChatDetailScreen';
import { NoteDetailScreen } from '~/components/inbox/NoteDetailScreen';
import { INBOX_ROUTE } from '~/services/navigation/routes';

export default function InboxDetailRoute() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();

  if (kind !== 'chat' && kind !== 'note') {
    return <Redirect href={INBOX_ROUTE} />;
  }

  return kind === 'chat' ? <ChatDetailScreen /> : <NoteDetailScreen />;
}
