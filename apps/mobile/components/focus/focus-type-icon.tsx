import { MaterialIcons } from '@expo/vector-icons'
import { theme } from '~/theme'
import type { FocusItem } from '~/utils/services/notes/types'

const ITEM_ICON_SIZE = 20
export const FocusItemIcon = ({ item }: { item: FocusItem }) => {
  switch (item.type) {
    case 'task':
      return (
        <MaterialIcons
          name="radio-button-off"
          color={theme.colors.quaternary}
          size={ITEM_ICON_SIZE}
        />
      )
    case 'event':
      return (
        <MaterialIcons
          name="calendar-today"
          color={theme.colors.quaternary}
          size={ITEM_ICON_SIZE}
        />
      )
    case 'reminder':
      return (
        <MaterialIcons name="notifications" color={theme.colors.quaternary} size={ITEM_ICON_SIZE} />
      )
    default:
      return null
  }
}
