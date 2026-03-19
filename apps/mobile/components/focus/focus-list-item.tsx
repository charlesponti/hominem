import { Link } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { memo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as ContextMenu from 'zeego/context-menu';

import { Text as MSText, makeStyles, theme } from '~/theme';
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion';
import { borderStyle, listStyles } from '~/theme/styles';
import { getLocalDate } from '~/utils/dates';
import type { FocusItem } from '~/utils/services/notes/types';
import { useDeleteFocus } from '~/utils/services/notes/use-delete-focus';

import { useFocusItemComplete } from '../../utils/services/notes/use-focus-item-complete';
import AppIcon, { type AppIconName } from '../ui/icon';

const SWIPE_THRESHOLD = 80;

function getPrimaryLine(value: string) {
  return (
    value
      .split('\n')
      .map((line) => line.trim())
      .find(Boolean) ?? 'Untitled note'
  );
}

function getPreviewLine(value: string) {
  const preview = value.replace(/\s+/g, ' ').trim();
  return preview.length > 120 ? `${preview.slice(0, 117)}...` : preview;
}

const FocusDueDate = memo(({ dueDate }: { dueDate: Date | null }) => {
  if (!dueDate) return null;

  const { localDateString } = getLocalDate(dueDate);

  return (
    <MSText variant="small" color="text-tertiary">
      {localDateString} {dueDate.toLocaleTimeString()}
    </MSText>
  );
});

FocusDueDate.displayName = 'FocusDueDate';

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      borderRadius: t.borderRadii.xl_20,
      overflow: 'hidden',
    },
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: t.spacing.sm_12,
      paddingHorizontal: t.spacing.m_16,
      borderRadius: t.borderRadii.xl_20,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors['border-default'],
      gap: t.spacing.sm_12,
    },
    focusInfoContainer: {
      flex: 1,
      gap: t.spacing.xs_4,
    },
    title: {
      fontWeight: '600',
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.foreground,
    },
    preview: {
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors['text-secondary'],
    },
    itemRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing.sm_12,
    },
    itemContent: {
      flex: 1,
      flexDirection: 'column',
      gap: t.spacing.xs_4,
    },
    triggerFull: {
      flex: 1,
      width: '100%',
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors['border-default'],
      backgroundColor: theme.colors['bg-surface'],
    },
    leftAction: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.muted,
      paddingHorizontal: t.spacing.ml_24,
    },
    rightAction: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'flex-end',
      backgroundColor: theme.colors.destructive,
      paddingHorizontal: t.spacing.ml_24,
    },
    actionText: {
      color: theme.colors.foreground,
      fontWeight: 'bold',
      fontFamily: 'Geist Mono',
    },
  }),
);

export const FocusListItem = ({
  item,
  label,
  itemIndex,
}: {
  item: FocusItem;
  label: string;
  itemIndex?: number;
}) => {
  const styles = useStyles();
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(64);
  const iconBackgroundColor = useSharedValue<string>(theme.colors.muted);
  const iconName = useSharedValue<AppIconName>('check');
  const isMutating = useSharedValue(false);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dueDate = item.due_date ? new Date(item.due_date) : null;
  const title = getPrimaryLine(label);
  const preview = getPreviewLine(label);

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    backgroundColor: iconBackgroundColor.value,
  }));

  const resetErrorState = useCallback(() => {
    iconName.value = 'circle-check';
    iconBackgroundColor.value = withTiming(theme.colors.muted, {
      duration: VOID_MOTION_DURATION_STANDARD,
    });
    isMutating.value = false;
  }, [iconName, iconBackgroundColor, isMutating]);

  const deleteFocusItem = useDeleteFocus({
    onSuccess: () => {
      isMutating.value = false;
    },
    onError: () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(resetErrorState, 1000);
    },
  });

  const completeItem = useFocusItemComplete({
    onSuccess: () => {
      iconBackgroundColor.value = withTiming(theme.colors.success, {
        duration: VOID_MOTION_DURATION_STANDARD,
      });
      isMutating.value = false;
    },
    onError: () => {
      iconName.value = 'circle-xmark';
      iconBackgroundColor.value = withTiming(theme.colors.destructive, {
        duration: VOID_MOTION_DURATION_STANDARD,
      });
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(resetErrorState, 1000);
    },
  });

  const panHandler = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-1000, 1000])
    .simultaneousWithExternalGesture(Gesture.Native())
    .onChange((event) => {
      if (event.numberOfPointers > 1) return;

      const { translationX, translationY } = event;
      if (Math.abs(translationX) > Math.abs(translationY)) {
        translateX.value = translationX;
      }
    })
    .onEnd(() => {
      if (isMutating.value) return;

      if (translateX.value > SWIPE_THRESHOLD) {
        isMutating.value = true;
        translateX.value = withTiming(0);
        runOnJS(completeItem.mutate)(item.id);
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        isMutating.value = true;
        translateX.value = withTiming(-itemHeight.value, {}, () => {
          runOnJS(deleteFocusItem.mutate)(item.id);
        });
      } else {
        translateX.value = withTiming(0, { duration: VOID_MOTION_DURATION_STANDARD });
      }
    });

  const combinedGesture = panHandler;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? translateX.value / SWIPE_THRESHOLD : 0,
  }));

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? -translateX.value / SWIPE_THRESHOLD : 0,
  }));

  const onDeleteMenuItemPress = useCallback(() => {
    deleteFocusItem.mutate(item.id);
  }, [deleteFocusItem, item.id]);

  const itemInfo = (
    <Reanimated.View style={[styles.itemContainer, animatedStyle]}>
      <View style={styles.itemRow}>
        <View style={styles.itemContent}>
          <View style={styles.focusInfoContainer}>
            <Reanimated.Text style={[listStyles.text, styles.title]}>{title}</Reanimated.Text>
            <Reanimated.Text style={[listStyles.text, styles.preview]}>{preview}</Reanimated.Text>
          </View>
          <FocusDueDate dueDate={dueDate} />
        </View>
        <Reanimated.View style={[styles.icon, iconStyle]}>
          <AppIcon name={iconName.value} size={20} color={theme.colors.foreground} />
        </Reanimated.View>
      </View>
    </Reanimated.View>
  );

  if (item.state === 'completed') {
    return (
      <View
        testID={typeof itemIndex === 'number' ? `focus-item-${itemIndex}` : undefined}
        style={[styles.container]}
      >
        {itemInfo}
      </View>
    );
  }

  return (
    <View
      testID={typeof itemIndex === 'number' ? `focus-item-${itemIndex}` : undefined}
      style={[styles.container]}
    >
      <Reanimated.View style={[styles.leftAction, leftActionStyle]}>
        <Text style={styles.actionText}>Complete</Text>
      </Reanimated.View>
      <Reanimated.View style={[styles.rightAction, rightActionStyle]}>
        <Text style={styles.actionText}>Delete</Text>
      </Reanimated.View>
      <ContextMenu.Root>
        <Link
          asChild
          href={{
            pathname: '/(protected)/(tabs)/focus/[id]' as RelativePathString,
            params: { id: item.id },
          }}
        >
          <ContextMenu.Trigger style={styles.triggerFull}>
            <GestureDetector gesture={combinedGesture}>{itemInfo}</GestureDetector>
          </ContextMenu.Trigger>
        </Link>
        <ContextMenu.Content
          alignOffset={10}
          loop={false}
          avoidCollisions={true}
          collisionPadding={12}
        >
          <ContextMenu.Label>Actions</ContextMenu.Label>
          <ContextMenu.Item key="delete" onSelect={onDeleteMenuItemPress}>
            <ContextMenu.ItemIcon ios={{ name: 'trash' }} />
            <ContextMenu.ItemTitle>Delete</ContextMenu.ItemTitle>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </View>
  );
};
