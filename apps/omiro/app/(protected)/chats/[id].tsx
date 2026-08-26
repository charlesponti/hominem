import { Redirect, useLocalSearchParams } from 'expo-router';

import { ChatScreen } from '~/components/inbox/ChatScreen';
import { InboxDetailChrome } from '~/components/inbox/InboxDetailChrome';
import { ALL_ROUTE } from '~/services/navigation/routes';

export default function ChatDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();

  if (!id) {
    return <Redirect href={ALL_ROUTE} />;
  }

  return (
    <InboxDetailChrome>
      <ChatScreen id={id} />
    </InboxDetailChrome>
  );
}
