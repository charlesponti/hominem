import { FlashList, type FlashListRef, type ListRenderItem } from '@shopify/flash-list';
import React, { memo, useCallback, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, RefreshControlProps } from 'react-native';
import { View } from 'react-native';

import { Text, makeStyles } from '~/components/theme';
import { EmptyState } from '~/components/ui/EmptyState';
import t from '~/translations';

import { InboxStreamItem } from './InboxStreamItem';
import type { InboxStreamItemData } from './InboxStreamItem.types';

const EMPTY_STATE_ASSETS = {
  chats: require('~/assets/states/chats.empty.png'),
  notes: require('~/assets/states/notes.empty.png'),
} as const;

export type InboxListRow =
  | {
      type: 'section';
      id: string;
      title: string;
    }
  | {
      type: 'item';
      id: string;
      item: InboxStreamItemData;
    };

export type InboxTab = 'chats' | 'notes';

interface InboxListProps {
  error?: Error | null;
  tab: InboxTab;
  items: InboxStreamItemData[];
  sectionTitle?: string;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  onEndReached?: () => void;
  onScrollOffsetChange?: (offset: number) => void;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  restoredScrollOffset?: number;
  contentPaddingTop?: number;
}

const RenderInboxHomeItem = memo(({ item }: { item: InboxStreamItemData }) => (
  <InboxStreamItem item={item} />
));

RenderInboxHomeItem.displayName = 'RenderInboxHomeItem';

function buildRows({ items }: Pick<InboxListProps, 'items'>): InboxListRow[] {
  return items.map((item) => ({
    type: 'item' as const,
    id: item.id,
    item,
  }));
}

export function InboxList({
  error,
  tab,
  items,
  isLoading = false,
  isFetchingNextPage = false,
  onEndReached,
  onScrollOffsetChange,
  refreshControl,
  restoredScrollOffset,
  contentPaddingTop,
}: InboxListProps) {
  const styles = useStyles();
  const listRef = useRef<FlashListRef<InboxListRow>>(null);
  const hasRestoredScrollRef = useRef(false);
  const rows = buildRows({ items });

  useEffect(() => {
    if (hasRestoredScrollRef.current || restoredScrollOffset == null || restoredScrollOffset <= 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ animated: false, offset: restoredScrollOffset });
      hasRestoredScrollRef.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [restoredScrollOffset]);

  const renderItem = useCallback<ListRenderItem<InboxListRow>>(({ item }) => {
    if (item.type === 'section') return null;
    return <RenderInboxHomeItem item={item.item} />;
  }, []);

  if (error && items.length === 0) {
    return (
      <View style={[styles.emptyWrap, styles.debugBorder]}>
        <EmptyState
          action={
            refreshControl?.props.onRefresh
              ? {
                  label: t.inbox.screen.retry,
                  onPress: refreshControl.props.onRefresh,
                }
              : undefined
          }
          sfSymbol="arrow.clockwise.circle"
          title={t.inbox.screen.loadErrorTitle}
        />
      </View>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <View style={[styles.emptyWrap, styles.debugBorder]}>
        <EmptyState
          imageSource={EMPTY_STATE_ASSETS[tab]}
          title={tab === 'notes' ? t.inbox.screen.emptyNotesTitle : t.inbox.empty.title}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        ref={listRef}
        contentContainerStyle={{
          paddingTop: contentPaddingTop,
        }}
        contentInsetAdjustmentBehavior="automatic"
        data={[...rows]}
        keyboardDismissMode="on-drag"
        keyExtractor={(item) => item.id}
        ListFooterComponent={
          isFetchingNextPage ? (
            <Text variant="caption1" color="tertiary" style={styles.footerText}>
              Loading more...
            </Text>
          ) : null
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) =>
          onScrollOffsetChange?.(event.nativeEvent.contentOffset.y)
        }
        refreshControl={refreshControl}
        renderItem={renderItem}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        testID="content-stream"
      />
    </View>
  );
}

const useStyles = makeStyles((theme) => ({
  emptyWrap: {
    flex: 1,
  },
  debugBorder: {
    borderColor: '#ff0000',
    borderWidth: 1,
  },
  container: {
    borderRadius: 12,
    flex: 1,
    paddingHorizontal: 0,
  },
  footerText: {
    paddingVertical: theme.spacing.lg,
    textAlign: 'center',
  },
}));
