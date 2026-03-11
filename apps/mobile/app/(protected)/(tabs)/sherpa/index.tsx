import { useLocalSearchParams, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import BlurredGradientBackground from '~/components/chat/blurred-background';
import { Chat } from '~/components/chat/chat';
import type { SessionSource } from '~/components/chat/context-anchor';
import { LoadingFull } from '~/components/LoadingFull';
import { Text } from '~/theme';
import type { Chat as ChatType } from '~/utils/local-store/types';
import { useActiveChat, useStartChat } from '~/utils/services/chat';

export default function Sherpa() {
  const router = useRouter();
  const params = useLocalSearchParams<{ intentId?: string; seed?: string }>();
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);
  const { isPending: isLoadingActiveChat, refetch: getActiveChat } = useActiveChat();
  const { mutateAsync: startChat, isPending: isStartingChat } = useStartChat({
    userMessage: params.seed || '',
    _sherpaMessage: 'Starting now.',
    onSuccess: (chat) => {
      setActiveChat(chat);
    },
  });

  useEffect(() => {
    async function initialLoad() {
      const response = await getActiveChat();

      if (response.data) {
        setActiveChat(response.data);
      } else if (params.seed) {
        await startChat();
      }
    }
    initialLoad();
    // we intentionally exclude startChat from deps to avoid duplicate start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getActiveChat, params.seed]);

  const onChatEnd = useCallback(() => {
    router.push('/(protected)/(tabs)/focus' as RelativePathString);
  }, [router]);

  // Local store Chat has no noteId — source is always 'new' on mobile.
  // AX-001: noteId not tracked in LocalStore.
  const source: SessionSource = { kind: 'new' }

  return (
    <BlurredGradientBackground testID="sherpa-screen">
      {isLoadingActiveChat || isStartingChat ? (
        <LoadingFull>
          <Text variant="title" color="foreground">
            LOADING CHAT STREAM...
          </Text>
        </LoadingFull>
      ) : null}
      {activeChat ? <Chat chatId={activeChat.id} onChatEnd={onChatEnd} source={source} /> : null}
    </BlurredGradientBackground>
  );
}
