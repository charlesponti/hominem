import { memo, useCallback, useEffect, useRef } from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import * as ContextMenu from 'zeego/context-menu'

import { Link } from 'expo-router'
import { Text as MSText, theme } from '~/theme'
import { VOID_MOTION_DURATION_STANDARD } from '~/theme/motion'
import { borderStyle, listStyles } from '~/theme/styles'
import { getLocalDate } from '~/utils/dates'
import queryClient from '~/utils/query-client'
import type { FocusItem } from '~/utils/services/notes/types'
import { useDeleteFocus } from '~/utils/services/notes/use-delete-focus'
import { useFocusItemComplete } from '../../utils/services/notes/use-focus-item-complete'
import MindsherpaIcon, { type MindsherpaIconName } from '../ui/icon'

const SWIPE_THRESHOLD = 80

function removeFocusItem(item: FocusItem) {
  queryClient.setQueryData(['focusItems'], (old: FocusItem[]) =>
    old.filter((focusItem) => focusItem.id !== item.id)
  )
}

const FocusDueDate = memo(({ dueDate }: { dueDate: Date | null }) => {
  if (!dueDate) return null

  const { localDateString } = getLocalDate(dueDate)

  return (
    <MSText variant="small" color="mutedForeground" fontSize={12}>
      {localDateString} {dueDate.toLocaleTimeString()}
    </MSText>
  )
})

FocusDueDate.displayName = 'FocusDueDate'

export const FocusListItem = ({
  item,
  label,
  itemIndex,
  showBorder,
  style,
  ...props
}: {
  item: FocusItem
  label: string
  itemIndex?: number
  showBorder?: boolean
  style?: ViewStyle[]
}) => {
  const translateX = useSharedValue(0)
  const itemHeight = useSharedValue(64)
  const iconBackgroundColor = useSharedValue(theme.colors.muted)
  const iconName = useSharedValue<MindsherpaIconName>('check')
  const isMutating = useSharedValue(false)
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dueDate = item.due_date ? new Date(item.due_date) : null

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
    }
  }, [])

  const iconStyle = useAnimatedStyle(() => ({
    backgroundColor: iconBackgroundColor.value,
  }))

  const resetErrorState = useCallback(() => {
    iconName.value = 'circle-check'
    iconBackgroundColor.value = withTiming(theme.colors.muted, {
      duration: VOID_MOTION_DURATION_STANDARD,
    })
    isMutating.value = false
  }, [iconName, iconBackgroundColor, isMutating])

  const deleteFocusItem = useDeleteFocus({
    onSuccess: async (deletedItemId) => {
      await queryClient.cancelQueries({ queryKey: ['focusItems'] })
      removeFocusItem(item)
      isMutating.value = false
    },
    onError: () => {
      const previousItems = queryClient.getQueryData(['focusItems'])
      queryClient.setQueryData(['focusItems'], previousItems)
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
      errorTimeoutRef.current = setTimeout(resetErrorState, 1000)
    },
  })

  const completeItem = useFocusItemComplete({
    onSuccess: (data) => {
      iconBackgroundColor.value = withTiming(theme.colors.green, {
        duration: VOID_MOTION_DURATION_STANDARD,
      })
      removeFocusItem(item)
      isMutating.value = false
    },
    onError: () => {
      iconName.value = 'circle-xmark'
      iconBackgroundColor.value = withTiming(theme.colors.red, {
        duration: VOID_MOTION_DURATION_STANDARD,
      })
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }
      errorTimeoutRef.current = setTimeout(resetErrorState, 1000)
    },
  })

  const panHandler = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-1000, 1000])
    .simultaneousWithExternalGesture(Gesture.Native())
    .onChange((event) => {
      if (event.numberOfPointers > 1) return

      const { translationX, translationY } = event
      if (Math.abs(translationX) > Math.abs(translationY)) {
        translateX.value = translationX
      }
    })
    .onEnd(() => {
      if (isMutating.value) return

      if (translateX.value > SWIPE_THRESHOLD) {
        isMutating.value = true
        translateX.value = withTiming(0)
        runOnJS(completeItem.mutate)(item.id)
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        isMutating.value = true
        translateX.value = withTiming(-itemHeight.value, {}, () => {
          runOnJS(deleteFocusItem.mutate)(item.id)
        })
      } else {
        translateX.value = withTiming(0, { duration: VOID_MOTION_DURATION_STANDARD })
      }
    })

  const combinedGesture = panHandler

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? translateX.value / SWIPE_THRESHOLD : 0,
  }))

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? -translateX.value / SWIPE_THRESHOLD : 0,
  }))

  const onDeleteMenuItemPress = useCallback(() => {
    deleteFocusItem.mutate(item.id)
  }, [deleteFocusItem, item.id])

  const itemInfo = (
    <Reanimated.View style={[styles.itemContainer, animatedStyle]}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, flexDirection: 'column', rowGap: 6 }}>
          <Reanimated.Text
            style={[
              listStyles.text,
              styles.focusInfoContainer,
              {
                flex: 1,
              },
            ]}
          >
            {label}
          </Reanimated.Text>
          <FocusDueDate dueDate={dueDate} />
        </View>
        <Reanimated.View style={[styles.icon, iconStyle]}>
          <MindsherpaIcon name={iconName.value} size={20} color={theme.colors.foreground} />
        </Reanimated.View>
      </View>
    </Reanimated.View>
  )

  if (item.state === 'completed') {
    return (
      <View testID={typeof itemIndex === 'number' ? `focus-item-${itemIndex}` : undefined} style={[styles.container]}>
        {itemInfo}
      </View>
    )
  }

  return (
    <View testID={typeof itemIndex === 'number' ? `focus-item-${itemIndex}` : undefined} style={[styles.container]}>
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
            pathname: '/(drawer)/(tabs)/focus/[id]',
            params: { id: item.id },
          }}
        >
          <ContextMenu.Trigger style={{ flex: 1, width: '100%' }}>
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
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    ...borderStyle.borderBottom,
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    paddingRight: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.muted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  focusInfoContainer: {
    flex: 1,
    fontWeight: 500,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.secondaryForeground,
  },
  icon: {
    borderRadius: 999,
    padding: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  leftAction: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.muted,
    paddingHorizontal: 20,
  },
  rightAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.destructive,
    paddingHorizontal: 20,
  },
  actionText: {
    color: theme.colors.foreground,
    fontWeight: 'bold',
    fontFamily: 'Geist Mono',
  },
})
