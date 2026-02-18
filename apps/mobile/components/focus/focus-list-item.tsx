import { useCallback } from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Reanimated, {
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import * as ContextMenu from 'zeego/context-menu'

import { Link } from 'expo-router'
import { Text as MSText, theme } from '~/theme'
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

export const FocusListItem = ({
  item,
  label,
  showBorder,
  style,
  ...props
}: {
  item: FocusItem
  label: string
  showBorder?: boolean
  style?: ViewStyle[]
}) => {
  const translateX = useSharedValue(0)
  const itemHeight = useSharedValue(70)
  const fontColor = useSharedValue(0)
  const iconBackgroundColor = useSharedValue(
    item.state === 'completed' ? theme.colors.green : theme.colors.grayLight
  )
  const iconName = useSharedValue<MindsherpaIconName>('check')
  const dueDate = item.due_date ? new Date(item.due_date) : null

  const iconStyle = useAnimatedStyle(() => ({
    backgroundColor: iconBackgroundColor.value,
  }))
  const deleteFocusItem = useDeleteFocus({
    onSuccess: async (deletedItemId) => {
      // Cancel any outgoing fetches
      await queryClient.cancelQueries({ queryKey: ['focusItems'] })

      // Remove the item from the list
      removeFocusItem(item)
    },
    onError: () => {
      const previousItems = queryClient.getQueryData(['focusItems'])
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['focusItems'], previousItems)
    },
  })

  const completeItem = useFocusItemComplete({
    onSuccess: (data) => {
      iconBackgroundColor.value = withTiming(theme.colors.green, {
        duration: 500,
      })

      // Remove the item from the list
      removeFocusItem(item)
    },
    onError: () => {
      iconName.value = 'circle-xmark'
      iconBackgroundColor.value = withTiming(theme.colors.red, {
        duration: 500,
      })
      setTimeout(() => {
        iconName.value = 'circle-check'
        iconBackgroundColor.value = withTiming(theme.colors.grayLight, {
          duration: 500,
        })
      }, 1000)
    },
  })

  const panHandler = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-1000, 1000])
    .simultaneousWithExternalGesture(Gesture.Native())
    .onChange((event) => {
      // Only allow one finger to pan
      if (event.numberOfPointers > 1) return

      const { translationX, translationY } = event
      if (Math.abs(translationX) > Math.abs(translationY)) {
        // Horizontal pan
        // This prevents the item from panning horizontally when the vertical swipe is greater.
        translateX.value = translationX
      }
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withTiming(0)
        runOnJS(completeItem.mutate)(item.id)
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-itemHeight.value, {}, () => {
          runOnJS(deleteFocusItem.mutate)(item.id)
        })
      } else {
        translateX.value = withSpring(0)
      }
    })

  const combinedGesture = panHandler

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(fontColor.value, [0, 1], [theme.colors.secondary, theme.colors.red]),
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
          backgroundColor: 'blue',
        }}
      >
        <View style={{ flex: 1, flexDirection: 'column', rowGap: 6, backgroundColor: 'red' }}>
          <Reanimated.Text
            style={[
              listStyles.text,
              styles.focusInfoContainer,
              textStyle,
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
          <MindsherpaIcon name={iconName.value} size={20} color="white" />
        </Reanimated.View>
      </View>
    </Reanimated.View>
  )

  if (item.state === 'completed') {
    return <View style={[styles.container]}>{itemInfo}</View>
  }

  return (
    <View style={[styles.container]}>
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
          <ContextMenu.Trigger action="longPress" style={{ flex: 1, width: '100%' }}>
            <Link.AppleZoom>
              <GestureDetector gesture={combinedGesture}>{itemInfo}</GestureDetector>
            </Link.AppleZoom>
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
            <ContextMenu.ItemIcon ios={{ name: 'trash', size: 20 }} />
            <ContextMenu.ItemTitle>Delete</ContextMenu.ItemTitle>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.white,
    ...borderStyle.borderBottom,
    borderRadius: 12,
    overflow: 'hidden',
  },
  itemContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    paddingRight: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
  },
  focusInfoContainer: {
    flex: 1,
    fontWeight: 500,
    fontSize: 18,
    lineHeight: 28,
  },
  icon: {
    borderRadius: 9999,
    padding: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftAction: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.green,
    paddingHorizontal: 20,
  },
  rightAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.red,
    paddingHorizontal: 20,
  },
  actionText: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
})

const FocusDueDate = ({ dueDate }: { dueDate: Date | null }) => {
  if (!dueDate) return null
  const { localDateString } = getLocalDate(dueDate)

  return (
    <MSText variant="body" color="grayDark" fontSize={13}>
      {dueDate.toLocaleDateString()} {dueDate.toLocaleTimeString()}
    </MSText>
  )
}
