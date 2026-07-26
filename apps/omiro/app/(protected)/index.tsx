import { Stack, useIsFocused, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarQuery } from '~/components/calendar/CalendarQuery';
import { Composer } from '~/components/composer/Composer';
import { InboxList, type InboxListRef, type InboxTab } from '~/components/inbox/InboxList';
import type { WorkspaceContext } from '~/components/navigation/WorkspaceContextPicker.ios';
import { WorkspaceToolbar } from '~/components/navigation/WorkspaceToolbar.ios';
import { makeStyles } from '~/components/theme';
import { useInboxStreamItems } from '~/services/inbox/use-inbox-stream-items';
import {
  clearInboxDraft,
  readInboxDraft,
  writeInboxDraft,
} from '~/services/navigation/launch-state';
import { SETTINGS_ROUTE } from '~/services/navigation/routes';
import t from '~/translations';

type InboxScreenTab = WorkspaceContext;

export default function InboxScreen() {
  const styles = useStyles();
  const isFocused = useIsFocused();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    error,
    items,
    isInitialLoading,
    isRefreshing,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInboxStreamItems({ enabled: isFocused });
  const listRef = useRef<InboxListRef>(null);
  const [activeTab, setActiveTab] = useState<InboxScreenTab>('notes');
  const [isSearchPresented, setIsSearchPresented] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isCalendarTab = activeTab === 'calendar';
  const inboxDraft = readInboxDraft();

  const handleOpenSettings = useCallback(() => router.push(SETTINGS_ROUTE), [router]);
  const handleSearchCancel = useCallback(() => {
    setSearchQuery('');
    setIsSearchPresented(false);
  }, []);

  const displayItems = useMemo(() => {
    const kind = activeTab === 'notes' ? 'note' : 'chat';
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return items
      .filter((item) => item.kind === kind)
      .filter(
        (item) =>
          !normalizedQuery ||
          [item.title, item.preview].some((value) =>
            value?.toLowerCase().includes(normalizedQuery),
          ),
      );
  }, [activeTab, items, searchQuery]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: '' }} />
      <WorkspaceToolbar
        activeContext={activeTab}
        isSearching={isSearchPresented}
        onContextChange={setActiveTab}
        onOpenSettings={handleOpenSettings}
        onSearchCancel={handleSearchCancel}
        onSearchChange={setSearchQuery}
        onSearchStart={() => setIsSearchPresented(true)}
        searchPlaceholder={t.inbox.screen.searchPlaceholder}
        searchQuery={searchQuery}
      />

      {isCalendarTab ? (
        <CalendarQuery isFocused={isFocused} />
      ) : (
        <View style={styles.listWrap}>
          <View style={styles.listInner}>
            <InboxList
              contentPaddingBottom={insets.bottom + 164}
              contentPaddingTop={4}
              error={error}
              isFetchingNextPage={isFetchingNextPage}
              isLoading={isInitialLoading}
              items={displayItems}
              listRef={listRef}
              tab={activeTab as InboxTab}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
              }}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refetch} />}
            />
          </View>
        </View>
      )}

      {isCalendarTab ? null : (
        <KeyboardStickyView
          offset={{ closed: 0, opened: 40 }}
          pointerEvents="box-none"
          style={styles.composerDock}
        >
          {/* oxfmt-ignore */}
          <View
            style={[
              styles.composerWrap,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            <Composer
              mode="inbox"
              entryMode={activeTab === 'chats' ? 'chat' : 'note'}
              initialMessage={inboxDraft}
              onDraftChange={writeInboxDraft}
              onClearDraft={clearInboxDraft}
            />
          </View>
        </KeyboardStickyView>
      )}
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  composerDock: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  composerWrap: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  container: {
    backgroundColor: theme.colors['surface-canvas'],
    flex: 1,
  },
  listInner: {
    flex: 1,
  },
  listWrap: {
    flex: 1,
  },
}));
