import { FlashList, type FlashListRef, type ListRenderItem } from '@shopify/flash-list';
import React, { memo, useCallback, type RefObject } from 'react';
import type { RefreshControlProps } from 'react-native';
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

export type InboxListRef = FlashListRef<InboxListRow>;
export type InboxTab = 'chats' | 'notes';

interface InboxListProps {
  error?: Error | null;
  tab: InboxTab;
  items: InboxStreamItemData[];
  sectionTitle?: string;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  listRef?: RefObject<FlashListRef<InboxListRow> | null>;
  onEndReached?: () => void;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentPaddingBottom?: number;
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
  listRef,
  onEndReached,
  refreshControl,
  contentPaddingBottom,
  contentPaddingTop,
}: InboxListProps) {
  const styles = useStyles();
  const rows = buildRows({ items });

  const renderItem = useCallback<ListRenderItem<InboxListRow>>(({ item }) => {
    if (item.type === 'section') return null;
    return <RenderInboxHomeItem item={item.item} />;
  }, []);

  if (error && items.length === 0) {
    return (
      <View style={styles.emptyWrap}>
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
      <View style={styles.emptyWrap}>
        <EmptyState
          imageSource={EMPTY_STATE_ASSETS[tab]}
          title={tab === 'notes' ? t.inbox.screen.emptyNotesTitle : t.inbox.empty.title}
        />
      </View>
    );
  }

  return (
    <FlashList
      ref={listRef}
      contentContainerStyle={{
        paddingTop: contentPaddingTop ?? 0,
        paddingBottom: contentPaddingBottom ?? 16,
      }}
      contentInsetAdjustmentBehavior="automatic"
      data={rows}
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
      refreshControl={refreshControl}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
    />
  );
}

const useStyles = makeStyles((theme) => ({
  emptyWrap: {
    flex: 1,
  },
  footerText: {
    paddingVertical: theme.spacing.lg,
    textAlign: 'center',
  },
}));
