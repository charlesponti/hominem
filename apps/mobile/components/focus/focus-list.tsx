import { fontSizes } from '@hominem/ui/tokens';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { RefreshControl } from 'react-native-gesture-handler';

import { makeStyles } from '~/theme';
import type { FocusItem } from '~/utils/services/notes/types';

import { FocusListItem } from './focus-list-item';

// Memoized render item component to prevent unnecessary re-renders
const RenderFocusItem = memo(({ item, index }: { item: FocusItem; index: number }) => {
  return <FocusListItem label={item.text} item={item} itemIndex={index} />;
});

RenderFocusItem.displayName = 'RenderFocusItem';

// Stable key extractor - just use item.id directly
const keyExtractor = (item: FocusItem) => item.id;

export const FocusList = ({
  data,
  isRefreshing,
  onRefresh,
}: {
  data: FocusItem[];
  isRefreshing: boolean;
  onRefresh: () => void;
}) => {
  const styles = useStyles();
  // Memoized render function with stable reference
  const renderItem = useCallback<ListRenderItem<FocusItem>>(({ item, index }) => {
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
