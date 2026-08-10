import { useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { Composer } from '~/components/composer/Composer';
import { ComposerDock } from '~/components/composer/ComposerDock';
import { InboxList } from '~/components/inbox/InboxList';
import { useInboxStreamItems } from '~/services/inbox/use-inbox-stream-items';
import {
  clearInboxDraft,
  clearResumeTarget,
  readInboxDraft,
  writeInboxDraft,
} from '~/services/navigation/launch-state';

interface InboxScreenProps {
  isFocused: boolean;
}

export function InboxScreen({ isFocused }: InboxScreenProps) {
  const [composerInset, setComposerInset] = useState(0);
  const {
    error,
    items,
    isInitialLoading,
    isRefreshing,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInboxStreamItems();

  useEffect(() => {
    if (isFocused) clearResumeTarget();
  }, [isFocused]);

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        <InboxList
          contentPaddingBottom={composerInset}
          emptyTitle="No recent work yet."
          error={error}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isInitialLoading}
          items={items}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
          }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} />}
        />
      </View>
      <ComposerDock onInsetChange={setComposerInset} testID="workspace-composer-dock">
        <Composer
          mode="inbox"
          entryMode="mixed"
          initialMessage={readInboxDraft()}
          onClearDraft={clearInboxDraft}
          onDraftChange={writeInboxDraft}
        />
      </ComposerDock>
    </View>
  );
}
