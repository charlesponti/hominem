import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Composer } from '~/components/composer/Composer';
import { ComposerDock, useComposerDockMetrics } from '~/components/composer/ComposerDock';
import { makeStyles } from '~/components/theme';
import {
  clearNewChatDraft,
  readNewChatDraft,
  writeNewChatDraft,
} from '~/services/navigation/launch-state';
import { getContentRoute } from '~/services/navigation/routes';

export function NewChatScreen() {
  const router = useRouter();
  const { seed } = useLocalSearchParams<{ seed?: string }>();
  const { safeAreaBottom } = useComposerDockMetrics();
  const initialMessage = seed?.trim() || readNewChatDraft();

  return (
    <View style={styles.container} testID="new-chat-screen">
      <ComposerDock safeAreaBottom={safeAreaBottom} testID="new-chat-composer-dock">
        <Composer
          entryMode="chat"
          initialMessage={initialMessage}
          mode="inbox"
          onClearDraft={clearNewChatDraft}
          onDraftChange={writeNewChatDraft}
          onStartChatAccepted={(chatId) => router.replace(getContentRoute('chat', chatId))}
          presentation="new-chat"
        />
      </ComposerDock>
    </View>
  );
}

const styles = makeStyles((theme) => ({
  container: { backgroundColor: theme.colors.background, flex: 1 },
}));
