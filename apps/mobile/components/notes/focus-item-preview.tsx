import { Pressable, StyleSheet, View, type ViewProps } from 'react-native'
import { Text, theme } from '~/theme'
import type { FocusItemInput } from '~/utils/services/notes/types'
import MindsherpaIcon from '../ui/icon'

function getReadableDate(date: FocusItemInput['due_date']) {
  if (!date) return null

  try {
    const dateObject = new Date(date)
    return dateObject.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch (error) {
    return null
  }
}

type FocusItemPreviewProps = {
  disabled: boolean
  focusItem: FocusItemInput
  onDeleteClick: (focusItem: FocusItemInput) => void
  onCreateClick: (focusItem: FocusItemInput) => void
} & ViewProps
const FocusItemPreview = ({
  disabled,
  focusItem,
  onDeleteClick,
  onCreateClick,
  ...props
}: FocusItemPreviewProps) => {
  const readableDate = getReadableDate(focusItem.due_date)
  const onDeleteIconPress = () => {
    onDeleteClick(focusItem)
  }

  const onIconPress = () => {
    onCreateClick(focusItem)
  }

  return (
    <View style={[focusItemStyles.item]} {...props}>
      <View style={[focusItemStyles.info]}>
        <Text variant="body" color="black">
          {focusItem.text}
        </Text>
        {focusItem.due_date && readableDate ? <Text variant="caption">{readableDate}</Text> : null}
      </View>
      <Pressable disabled={disabled} style={[focusItemStyles.icon]} onPress={onDeleteIconPress}>
        <MindsherpaIcon name="trash" size={24} color={theme.colors.red} />
      </Pressable>
      <Pressable disabled={disabled} style={[focusItemStyles.icon]} onPress={onIconPress}>
        <MindsherpaIcon name="list-tree" size={24} color={theme.colors.foreground} />
      </Pressable>
    </View>
  )
}

const focusItemStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    backgroundColor: theme.colors.blueLight,
    borderRadius: 16,
  },
  info: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  icon: {
    justifyContent: 'center',
    marginRight: 20,
  },
})

export default FocusItemPreview
