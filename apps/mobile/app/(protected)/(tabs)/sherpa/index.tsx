import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import type { Chat as ChatType } from '@hominem/hono-rpc/types';
import React from 'react';
import { useCallback, useRef, useState } from 'react';

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
  const hasInitialized = useRef(false);
  const { isPending: isLoadingActiveChat, refetch: getActiveChat } = useActiveChat(params.chatId);

  const isChatRecord = (value: ChatType | null | undefined): value is ChatType => {
    return Boolean(value && typeof value.id === 'string' && typeof value.userId === 'string')
  }

  const updateHeader = useCallback((title?: string | null) => {
    setActiveContext('chat');
    setHeader({
      kicker: 'Chat',
      title: title?.trim() || 'New conversation',
    });
  }, [setActiveContext, setHeader]);

  const { mutateAsync: startChat, isPending: isStartingChat } = useStartChat({
    userMessage: params.seed || '',
    _sherpaMessage: 'Starting now.',
    onSuccess: (chat) => {
      setActiveChat(chat);
      updateHeader(chat.title);
    },
  });

  useFocusEffect(useCallback(() => {
    updateHeader(activeChat?.title);
  }, [activeChat?.title, updateHeader]));

  useFocusEffect(useCallback(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initialLoad() {
      const response = await getActiveChat();

      if (isChatRecord(response.data)) {
        setActiveChat(response.data);
        updateHeader(response.data.title);
      } else if (params.seed) {
        await startChat();
      }
    }
    initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getActiveChat, params.seed, updateHeader]));

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
