import { Redirect, useLocalSearchParams } from 'expo-router';

import { ChatScreen } from '~/components/inbox/ChatScreen';
import { InboxDetailChrome } from '~/components/inbox/InboxDetailChrome';
import { STREAM_ROUTE } from '~/services/navigation/routes';

export default function ChatDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (!id) {
    return <Redirect href={STREAM_ROUTE} />;
  }

  return (
    <InboxDetailChrome>
      <ChatScreen id={id} />
    </InboxDetailChrome>
  );
}
