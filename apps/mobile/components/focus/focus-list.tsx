import { memo, useCallback } from 'react'
import { StyleSheet } from 'react-native'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { RefreshControl } from 'react-native-gesture-handler'
import type { FocusItem } from '~/utils/services/notes/types'
import { FocusListItem } from './focus-list-item'

// Memoized render item component to prevent unnecessary re-renders
const RenderFocusItem = memo(({ item, index, totalCount }: { item: FocusItem; index: number; totalCount: number }) => {
  return (
    <FocusListItem
      label={item.text}
      item={item}
      itemIndex={index}
      showBorder={totalCount === 1 || index < totalCount - 1}
    />
  )
})

RenderFocusItem.displayName = 'RenderFocusItem'

// Stable key extractor - just use item.id directly
const keyExtractor = (item: FocusItem) => item.id

export const FocusList = ({
  data,
  isRefreshing,
  onRefresh,
}: {
  data: FocusItem[]
  isRefreshing: boolean
  onRefresh: () => void
}) => {
  // Memoized render function with stable reference
  const renderItem = useCallback<ListRenderItem<FocusItem>>(
    ({ item, index }) => {
      return <RenderFocusItem item={item} index={index} totalCount={data.length} />
    },
    [data.length]
  )

  if (!data.length) {
    return null
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
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 32,
  },
  listContainer: {
    rowGap: 12,
    // This enables users to scroll the the last item above the `Sherpa` button
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  headerText: {
    fontSize: 14,
    color: '#667085',
  },
})
