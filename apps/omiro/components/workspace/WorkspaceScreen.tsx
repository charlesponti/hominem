import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { Composer } from '~/components/composer/Composer';
import { ComposerDock } from '~/components/composer/ComposerDock';
import { InboxList, type InboxTab } from '~/components/inbox/InboxList';
import { WorkspaceToolbar } from '~/components/navigation/WorkspaceToolbar.ios';
import { makeStyles } from '~/components/theme';
import type { TimeItem } from '~/components/time/time-types';
import { TimeBlockSheet } from '~/components/time/TimeBlockSheet';
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
import { SETTINGS_ROUTE, type TimeBlockSource } from '~/services/navigation/routes';
import t from '~/translations';

import {
  initialContentWorkspaceSnapshot,
  type ContentWorkspaceSnapshot,
  type WorkspaceContext,
} from './workspace-types';

interface WorkspaceScreenProps {
  isFocused: boolean;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function WorkspaceScreen({ isFocused }: WorkspaceScreenProps) {
  const styles = useStyles();
  const router = useRouter();
  const { context, timeId, timeSource } = useLocalSearchParams<{
    context?: string;
    timeId?: string;
    timeSource?: TimeBlockSource;
  }>();
  const isTimeRoute = context === 'time';
  const [activeContext, setActiveContext] = useState<WorkspaceContext>(
    isTimeRoute ? 'time' : 'notes',
  );
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
  const timeSelection =
    isTimeRoute && timeId && (timeSource === 'event' || (timeSource === 'task' && isUuid(timeId)))
      ? { id: timeId, source: timeSource }
      : null;

  useEffect(() => {
    if (isTimeRoute) setActiveContext('time');
  }, [isTimeRoute]);

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
  const handleContextChange = useCallback(
    (nextContext: WorkspaceContext) => {
      setActiveContext(nextContext);
      if (nextContext === 'time') {
        router.setParams({ context: 'time' });
        return;
      }
      router.setParams({ context: undefined, timeId: undefined, timeSource: undefined });
    },
    [router],
  );
  const handleOpenTimeItem = useCallback(
    (item: TimeItem) =>
      router.setParams({
        context: 'time',
        timeId: item.value.id,
        timeSource: item.kind,
      }),
    [router],
  );
  const handleDismissTimeItem = useCallback(
    () => router.setParams({ timeId: undefined, timeSource: undefined }),
    [router],
  );
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
        onContextChange={handleContextChange}
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
          onOpenItem={handleOpenTimeItem}
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
      <TimeBlockSheet onDismiss={handleDismissTimeItem} selection={timeSelection} />
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  container: { backgroundColor: theme.colors.background, flex: 1 },
  listWrap: { flex: 1 },
}));
