import { FlashList, type FlashListRef, type ListRenderItem } from '@shopify/flash-list';
import { type ReactElement, useEffect, useRef } from 'react';
import {
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type RefreshControlProps,
} from 'react-native';

interface StreamListProps<T> {
  contentPaddingBottom?: number;
  contentPaddingTop?: number;
  data: readonly T[];
  keyExtractor: (item: T) => string;
  ListEmptyComponent?: ReactElement | null;
  ListFooterComponent?: ReactElement | null;
  ListHeaderComponent?: ReactElement | null;
  onEndReached?: () => void;
  onScrollOffsetChange?: (offset: number) => void;
  refreshControl?: ReactElement<RefreshControlProps>;
  renderItem: ListRenderItem<T>;
  restoredScrollOffset?: number;
  testID: string;
}

export function StreamList<T>({
  contentPaddingBottom = 0,
  contentPaddingTop = 0,
  data,
  keyExtractor,
  ListEmptyComponent,
  ListFooterComponent,
  ListHeaderComponent,
  onEndReached,
  onScrollOffsetChange,
  refreshControl,
  renderItem,
  restoredScrollOffset = 0,
  testID,
}: StreamListProps<T>) {
  const listRef = useRef<FlashListRef<T>>(null);
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (hasRestoredRef.current || restoredScrollOffset <= 0) return;
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ animated: false, offset: restoredScrollOffset });
      hasRestoredRef.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [restoredScrollOffset]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onScrollOffsetChange?.(event.nativeEvent.contentOffset.y);
  };

  return (
    <FlashList
      ref={listRef}
      contentContainerStyle={{
        paddingBottom: Platform.OS === 'android' ? contentPaddingBottom : undefined,
        paddingTop: contentPaddingTop,
      }}
      contentInset={Platform.OS === 'ios' ? { bottom: contentPaddingBottom } : undefined}
      contentInsetAdjustmentBehavior="automatic"
      data={data}
      keyboardDismissMode="on-drag"
      keyExtractor={keyExtractor}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={ListFooterComponent}
      ListHeaderComponent={ListHeaderComponent}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.4}
      onScroll={onScroll}
      refreshControl={refreshControl}
      renderItem={renderItem}
      scrollEventThrottle={16}
      scrollIndicatorInsets={Platform.OS === 'ios' ? { bottom: contentPaddingBottom } : undefined}
      showsVerticalScrollIndicator={false}
      testID={testID}
    />
  );
}
