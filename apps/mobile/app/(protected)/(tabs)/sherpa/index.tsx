import type { Chat as ChatType } from '@hominem/rpc/types';
import type { SessionSource } from '@hominem/ui/chat';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chat } from '~/components/chat/chat';
import { LoadingFull } from '~/components/LoadingFull';
import { donateStartChatIntent } from '~/lib/intent-donation';
import { useChatLiveActivity } from '~/lib/use-chat-live-activity';
import { makeStyles, Text } from '~/theme';
import { useActiveChat, useStartChat } from '~/utils/services/chat';

const isChatRecord = (value: ChatType | null | undefined): value is ChatType => {
  return Boolean(value && typeof value.id === 'string' && typeof value.userId === 'string');
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.colors['bg-elevated'],
    },
  }),
);

export default function Sherpa() {
  const router = useRouter();
  const styles = useStyles();
  const params = useLocalSearchParams<{ chatId?: string; intentId?: string; seed?: string }>();
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);
  const { isPending: isLoadingActiveChat, refetch: getActiveChat } = useActiveChat(params.chatId);
  const seed = params.seed ?? '';

  const { mutateAsync: startChat, isPending: isStartingChat } = useStartChat({
    userMessage: seed,
    _sherpaMessage: 'Starting now.',
    onSuccess: (chat) => {
      setActiveChat(chat);
    },
  });

  // Donate intent so Siri learns the user opens Sherpa frequently
  useEffect(() => {
    donateStartChatIntent();
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void getActiveChat().then(async (response) => {
      if (isCancelled) {
        return;
      }

      if (isChatRecord(response.data)) {
        setActiveChat(response.data);
        return;
      }

      if (seed) {
        await startChat();
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [getActiveChat, seed, startChat]);

  const { stop: stopLiveActivity } = useChatLiveActivity(
    activeChat?.id,
    activeChat?.title ?? undefined,
  );

  const onChatArchive = useCallback(() => {
    stopLiveActivity();
    router.push('/(protected)/(tabs)/focus' as RelativePathString);
  }, [router, stopLiveActivity]);

  // Local store Chat has no noteId — source is always 'new' on mobile.
  // AX-001: noteId not tracked in LocalStore.
  const source: SessionSource = { kind: 'new' };

  return (
    <View testID="sherpa-screen" style={styles.container}>
      {isLoadingActiveChat || isStartingChat ? (
        <LoadingFull>
          <Text variant="title" color="foreground">
            LOADING CHAT STREAM...
          </Text>
        </LoadingFull>
      ) : null}
      {activeChat ? (
        <Chat chatId={activeChat.id} onChatArchive={onChatArchive} source={source} />
      ) : null}
    </View>
  );
}
