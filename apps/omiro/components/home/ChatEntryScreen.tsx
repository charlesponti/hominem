import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useStyles } from '~/components/theme';
import { EmptyState } from '~/components/ui';
import { useLatestChat } from '~/services/chat/use-chats-list';
import { NEW_CHAT_ROUTE, getContentRoute } from '~/services/navigation/routes';

export function ChatEntryScreen() {
  const router = useRouter();
  const latestChat = useLatestChat();
  const redirected = useRef(false);
  const styles = useStyles((theme) => ({
    container: {
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      flex: 1,
      justifyContent: 'center',
    },
  }));

  useEffect(() => {
    if (redirected.current || latestChat.isPending) {
      return;
    }

    if (latestChat.data) {
      redirected.current = true;
      router.replace(getContentRoute('chat', latestChat.data.id));
      return;
    }

    if (!latestChat.error) {
      redirected.current = true;
      router.replace(NEW_CHAT_ROUTE);
    }
  }, [latestChat.data, latestChat.error, latestChat.isPending, router]);

  if (latestChat.error) {
    return (
      <View style={styles.container} testID="chat-entry-error">
        <EmptyState
          action={{ label: 'Retry', onPress: () => void latestChat.refetch() }}
          description="Your chats could not be loaded."
          sfSymbol="arrow.clockwise.circle"
          title="Chats unavailable"
        />
      </View>
    );
  }

  return (
    <View accessibilityLabel="Loading chats" style={styles.container} testID="chat-entry-loading">
      <ActivityIndicator />
    </View>
  );
}
