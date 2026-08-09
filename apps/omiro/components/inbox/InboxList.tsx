import { FlashList, type FlashListRef, type ListRenderItem } from '@shopify/flash-list';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, RefreshControlProps } from 'react-native';
import { Platform, Text, View } from 'react-native';

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
  tab?: InboxTab;
  emptyTitle?: string;
  items: InboxStreamItemData[];
  sectionTitle?: string;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  onEndReached?: () => void;
  onScrollOffsetChange?: (offset: number) => void;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  restoredScrollOffset?: number;
  contentPaddingTop?: number;
  contentPaddingBottom?: number;
}

const RenderInboxHomeItem = memo(
  ({
    animateOnMount,
    index,
    isNew,
    item,
  }: {
    animateOnMount: boolean;
    index: number;
    isNew: boolean;
    item: InboxStreamItemData;
  }) => <InboxStreamItem item={item} animateOnMount={animateOnMount} index={index} isNew={isNew} />,
);

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
  emptyTitle,
  items,
  isLoading = false,
  isFetchingNextPage = false,
  onEndReached,
  onScrollOffsetChange,
  refreshControl,
  restoredScrollOffset,
  contentPaddingTop,
  contentPaddingBottom,
}: InboxListProps) {
  const listRef = useRef<FlashListRef<InboxListRow>>(null);
  const hasRestoredScrollRef = useRef(false);
  const entranceDoneRef = useRef(false);
  const sawLoadingRef = useRef(false);
  const seenIdsRef = useRef(new Set<string>());
  const [animateEntrance, setAnimateEntrance] = useState(false);
  const rows = buildRows({ items });

  useEffect(() => {
    if (isLoading) sawLoadingRef.current = true;
  }, [isLoading]);

  useEffect(() => {
    if (!sawLoadingRef.current || isLoading || items.length === 0 || entranceDoneRef.current) {
      return;
    }
    entranceDoneRef.current = true;
    setAnimateEntrance(true);
    const timer = setTimeout(() => setAnimateEntrance(false), 600);
    return () => clearTimeout(timer);
  }, [isLoading, items.length]);

  const freshIds = useMemo(
    () =>
      new Set(
        seenIdsRef.current.size > 0
          ? items.filter((item) => !seenIdsRef.current.has(item.id)).map((item) => item.id)
          : [],
      ),
    [items],
  );

  useEffect(() => {
    for (const item of items) {
      seenIdsRef.current.add(item.id);
    }
  }, [items]);

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

  const renderItem = useCallback<ListRenderItem<InboxListRow>>(
    ({ item, index }) => {
      if (item.type === 'section') return null;
      const rowIndex = index ?? 0;
      return (
        <RenderInboxHomeItem
          animateOnMount={animateEntrance}
          index={rowIndex}
          isNew={!animateEntrance && rowIndex === 0 && freshIds.has(item.item.id)}
          item={item.item}
        />
      );
    },
    [animateEntrance, freshIds],
  );

  if (error && items.length === 0) {
    return (
      <View className="flex-1">
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
      <View className="flex-1">
        <EmptyState
          imageSource={tab ? EMPTY_STATE_ASSETS[tab] : undefined}
          sfSymbol={tab ? undefined : 'tray'}
          title={
            emptyTitle ?? (tab === 'notes' ? t.inbox.screen.emptyNotesTitle : t.inbox.empty.title)
          }
        />
      </View>
    );
  }

  return (
    <View className="flex-1 rounded-xl px-0">
      <FlashList
        ref={listRef}
        contentContainerStyle={{
          paddingTop: contentPaddingTop,
          paddingBottom: Platform.OS === 'android' ? contentPaddingBottom : undefined,
        }}
        contentInset={Platform.OS === 'ios' ? { bottom: contentPaddingBottom } : undefined}
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={Platform.OS === 'ios' ? { bottom: contentPaddingBottom } : undefined}
        data={[...rows]}
        keyboardDismissMode="on-drag"
        keyExtractor={(item) => item.id}
        ListFooterComponent={
          isFetchingNextPage ? (
            <Text className="text-caption1 text-tertiary py-4 text-center">Loading more...</Text>
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
