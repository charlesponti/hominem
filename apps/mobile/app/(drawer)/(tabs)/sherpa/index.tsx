import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import type { Chat as ChatType } from '~/utils/local-store/types';

import BlurredGradientBackground from '~/components/chat/blurred-background';
import { Chat } from '~/components/chat/chat';
import { LoadingFull } from '~/components/LoadingFull';
import { Text } from '~/theme';
import { useActiveChat, useStartChat } from '~/utils/services/chat/use-chat-messages';

export default function Sherpa() {
  const router = useRouter();
  const params = useLocalSearchParams<{ intentId?: string; seed?: string }>();
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);
  const { isPending: isLoadingActiveChat, refetch: getActiveChat } = useActiveChat();
  const { mutateAsync: startChat, isPending: isStartingChat } = useStartChat({
    userMessage: params.seed || '',
    sherpaMessage: 'Starting now.',
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
    router.push('/(drawer)/(tabs)/focus');
  }, [router]);

  return (
    <BlurredGradientBackground>
      {isLoadingActiveChat || isStartingChat ? (
        <LoadingFull>
          <Text variant="title" color="foreground">
            LOADING CHAT STREAM...
          </Text>
        </LoadingFull>
      ) : null}
      {activeChat ? <Chat chatId={activeChat.id} onChatEnd={onChatEnd} /> : null}
    </BlurredGradientBackground>
  );
}
