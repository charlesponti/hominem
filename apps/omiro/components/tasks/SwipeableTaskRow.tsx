import { useCallback, useRef } from 'react';
import { Alert, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SharedValue } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { SwipeAction } from '~/components/ui';
import t from '~/translations';

interface SwipeableTaskRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  isList?: boolean;
}

export function SwipeableTaskRow({ children, onDelete, isList = false }: SwipeableTaskRowProps) {
  const [destructive] = useCSSVariable(['--color-destructive']) as string[];
  const swipeableRef = useRef<SwipeableMethods>(null);

  const handleDelete = useCallback(() => {
    swipeableRef.current?.close();
    const copy = isList ? t.tasks.deleteList : t.tasks.deleteTask;
    Alert.alert(copy.title, copy.message, [
      { text: copy.cancel, style: 'cancel' },
      { text: copy.confirm, style: 'destructive', onPress: onDelete },
    ]);
  }, [isList, onDelete]);

  const renderSwipeAction = useCallback(
    (progress: SharedValue<number>) => (
      <SwipeAction
        progress={progress}
        iconName="trash"
        onPress={handleDelete}
        accessibilityLabel={t.tasks.delete}
        backgroundColor={destructive}
      />
    ),
    [handleDelete, destructive],
  );

  return (
    <View className="px-4">
      <ReanimatedSwipeable
        ref={swipeableRef}
        containerStyle={{ overflow: 'visible' }}
        childrenContainerStyle={{ overflow: 'visible' }}
        renderRightActions={renderSwipeAction}
        rightThreshold={60}
        friction={2}
        overshootRight={false}
        enableTrackpadTwoFingerGesture
      >
        {children}
      </ReanimatedSwipeable>
    </View>
  );
}
