import { fontSizes } from '@hominem/ui/tokens';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { RefreshControl } from 'react-native-gesture-handler';

import { makeStyles } from '~/theme';
import type { Note } from '@hominem/hono-rpc/types';

import { FocusListItem } from './focus-list-item';

// Memoized render item component to prevent unnecessary re-renders
const RenderFocusItem = memo(({ item, index }: { item: Note; index: number }) => {
  const label = item.title || item.excerpt || item.content || '';
  return <FocusListItem label={label} item={item} itemIndex={index} />;
});

RenderFocusItem.displayName = 'RenderFocusItem';

// Stable key extractor - just use item.id directly
const keyExtractor = (item: Note) => item.id;

export const FocusList = ({
  data,
  isRefreshing,
  onRefresh,
}: {
  data: Note[];
  isRefreshing: boolean;
  onRefresh: () => void;
}) => {
  const styles = useStyles();
  // Memoized render function with stable reference
  const renderItem = useCallback<ListRenderItem<Note>>(({ item, index }) => {
    return <RenderFocusItem item={item} index={index} />;
  }, []);

  if (!data.length) {
    return null;
  }

  return (
    <FlashList
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      style={styles.container}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
      scrollEnabled={true}
      showsVerticalScrollIndicator={true}
      // FlashList optimizations for smooth scrolling
      removeClippedSubviews={true}
    />
  );
};

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingBottom: t.spacing.l_32,
    },
    listContainer: {
      rowGap: t.spacing.sm_12,
      // This enables users to scroll the the last item above the `Sherpa` button
      paddingBottom: t.spacing.xl_64 + t.spacing.l_32 + t.spacing.ml_24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: t.spacing.sm_8,
      paddingHorizontal: t.spacing.m_16,
      paddingVertical: t.spacing.xs_4,
    },
    headerText: {
      fontSize: fontSizes.sm,
      color: t.colors['text-tertiary'],
    },
  }),
);
