import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { Composer } from '~/components/composer/Composer';
import { ComposerDock } from '~/components/composer/ComposerDock';
import { InboxList, type InboxTab } from '~/components/inbox/InboxList';
import { WorkspaceToolbar } from '~/components/navigation/WorkspaceToolbar.ios';
import { makeStyles } from '~/components/theme';
import {
  initialTimeWorkspaceSnapshot,
  TimeWorkspace,
  type TimeWorkspaceSnapshot,
} from '~/components/time/TimeWorkspace';
import { useInboxStreamItems } from '~/services/inbox/use-inbox-stream-items';
import {
  clearInboxDraft,
  clearResumeTarget,
  readInboxDraft,
  writeInboxDraft,
} from '~/services/navigation/launch-state';
import { SETTINGS_ROUTE } from '~/services/navigation/routes';
import t from '~/translations';

import {
  initialContentWorkspaceSnapshot,
  type ContentWorkspaceSnapshot,
  type WorkspaceContext,
} from './workspace-types';

interface WorkspaceScreenProps {
  isFocused: boolean;
}

export function WorkspaceScreen({ isFocused }: WorkspaceScreenProps) {
  const styles = useStyles();
  const router = useRouter();
  const [activeContext, setActiveContext] = useState<WorkspaceContext>('notes');
  const [contentSnapshots, setContentSnapshots] = useState<
    Record<InboxTab, ContentWorkspaceSnapshot>
  >({
    chats: initialContentWorkspaceSnapshot(),
    notes: initialContentWorkspaceSnapshot(),
  });
  const [timeSnapshot, setTimeSnapshot] = useState<TimeWorkspaceSnapshot>(
    initialTimeWorkspaceSnapshot,
  );
  const isContentWorkspace = activeContext !== 'time';
  const {
    error,
    items,
    isInitialLoading,
    isRefreshing,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInboxStreamItems({ enabled: isContentWorkspace });
  const activeContentContext = activeContext === 'time' ? 'notes' : activeContext;
  const activeContentSnapshot = contentSnapshots[activeContentContext];

  useEffect(() => {
    if (isFocused) clearResumeTarget();
  }, [isFocused]);

  const updateActiveContentSnapshot = useCallback(
    (update: Partial<ContentWorkspaceSnapshot>) => {
      setContentSnapshots((current) => ({
        ...current,
        [activeContentContext]: { ...current[activeContentContext], ...update },
      }));
    },
    [activeContentContext],
  );
  const handleOpenSettings = useCallback(() => router.push(SETTINGS_ROUTE), [router]);
  const handleSearchCancel = useCallback(
    () => updateActiveContentSnapshot({ isSearching: false, searchQuery: '' }),
    [updateActiveContentSnapshot],
  );
  const displayItems = useMemo(() => {
    const kind = activeContentContext === 'notes' ? 'note' : 'chat';
    const normalizedQuery = activeContentSnapshot.searchQuery.trim().toLowerCase();

    return items
      .filter((item) => item.kind === kind)
      .filter(
        (item) =>
          !normalizedQuery ||
          [item.title, item.preview].some((value) =>
            value?.toLowerCase().includes(normalizedQuery),
          ),
      );
  }, [activeContentContext, activeContentSnapshot.searchQuery, items]);

  return (
    <View style={styles.container}>
      <WorkspaceToolbar
        activeContext={activeContext}
        isSearching={isContentWorkspace && activeContentSnapshot.isSearching}
        showSearch={isContentWorkspace}
        onContextChange={setActiveContext}
        onOpenSettings={handleOpenSettings}
        onSearchCancel={handleSearchCancel}
        onSearchChange={(searchQuery) => updateActiveContentSnapshot({ searchQuery })}
        onSearchStart={() => updateActiveContentSnapshot({ isSearching: true })}
        searchPlaceholder={t.inbox.screen.searchPlaceholder}
        searchQuery={activeContentSnapshot.searchQuery}
      />

      {activeContext === 'time' ? (
        <TimeWorkspace
          isFocused={isFocused}
          snapshot={timeSnapshot}
          onSnapshotChange={setTimeSnapshot}
        />
      ) : (
        <>
          <View style={styles.listWrap}>
            <InboxList
              error={error}
              isFetchingNextPage={isFetchingNextPage}
              isLoading={isInitialLoading}
              items={displayItems}
              restoredScrollOffset={activeContentSnapshot.scrollOffset}
              tab={activeContext}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
              }}
              onScrollOffsetChange={(scrollOffset) => updateActiveContentSnapshot({ scrollOffset })}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} />}
            />
          </View>
          <ComposerDock testID="workspace-composer-dock">
            <Composer
              mode="inbox"
              entryMode={activeContext === 'chats' ? 'chat' : 'note'}
              initialMessage={readInboxDraft()}
              onClearDraft={clearInboxDraft}
              onDraftChange={writeInboxDraft}
            />
          </ComposerDock>
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: { backgroundColor: theme.colors.background, flex: 1 },
  listWrap: { flex: 1 },
}));
