import { useLocalSearchParams, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import type { Chat as ChatType } from '@hominem/hono-rpc/types';
import React from 'react';
import { useCallback, useEffect, useState } from 'react';

import BlurredGradientBackground from '~/components/chat/blurred-background';
import { Chat } from '~/components/chat/chat';
import type { SessionSource } from '~/components/chat/context-anchor';
import { LoadingFull } from '~/components/LoadingFull';
import { useMobileWorkspace } from '~/components/workspace/mobile-workspace-context';
import { Text } from '~/theme';
import { useActiveChat, useStartChat } from '~/utils/services/chat';

export default function Sherpa() {
  const router = useRouter();
  const { setActiveContext, setHeader } = useMobileWorkspace();
  const params = useLocalSearchParams<{ chatId?: string; intentId?: string; seed?: string }>();
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);
  const { isPending: isLoadingActiveChat, refetch: getActiveChat } = useActiveChat(params.chatId);
  const { mutateAsync: startChat, isPending: isStartingChat } = useStartChat({
    userMessage: params.seed || '',
    _sherpaMessage: 'Starting now.',
    onSuccess: (chat) => {
      setActiveChat(chat);
    },
  });

  const isChatRecord = (value: ChatType | null | undefined): value is ChatType => {
    return Boolean(value && typeof value.id === 'string' && typeof value.userId === 'string')
  }

  useEffect(() => {
    setActiveContext('chat');
    setHeader({
      kicker: 'Chat',
      title: activeChat?.title?.trim() || 'New conversation',
    });
  }, [activeChat?.title, setActiveContext, setHeader]);

  useEffect(() => {
    async function initialLoad() {
      const response = await getActiveChat();

      if (isChatRecord(response.data)) {
        setActiveChat(response.data);
      } else if (params.seed) {
        await startChat();
      }
    }
    initialLoad();
    // we intentionally exclude startChat from deps to avoid duplicate start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getActiveChat, params.seed]);

  const onChatArchive = useCallback(() => {
    router.push('/(protected)/(tabs)/focus' as RelativePathString);
  }, [router]);

  // Local store Chat has no noteId — source is always 'new' on mobile.
  // AX-001: noteId not tracked in LocalStore.
  const source: SessionSource = { kind: 'new' };

  return (
    <BlurredGradientBackground testID="sherpa-screen">
      {isLoadingActiveChat || isStartingChat ? (
        <LoadingFull>
          <Text variant="title" color="foreground">
            LOADING CHAT STREAM...
          </Text>
        </LoadingFull>
      ) : null}
      {activeChat ? <Chat chatId={activeChat.id} onChatArchive={onChatArchive} source={source} /> : null}
    </BlurredGradientBackground>
  );
}
