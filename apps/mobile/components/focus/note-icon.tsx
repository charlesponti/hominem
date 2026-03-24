import { MaterialIcons } from '@expo/vector-icons';
import type { Note } from '@hominem/rpc/types';

import { theme } from '~/theme';

const ITEM_ICON_SIZE = 20;
export const NoteIcon = ({ item }: { item: Note }) => {
  switch (item.type) {
    case 'task':
      return (
        <MaterialIcons
          name="radio-button-off"
          color={theme.colors['emphasis-low']}
          size={ITEM_ICON_SIZE}
        />
      );
    case 'timer':
      return (
        <MaterialIcons
          name="calendar-today"
          color={theme.colors['emphasis-low']}
          size={ITEM_ICON_SIZE}
        />
      );
    case 'journal':
    case 'document':
    case 'essay':
    case 'blog_post':
    case 'social_post':
    case 'tweet':
    case 'note':
      return (
        <MaterialIcons
          name="notifications"
          color={theme.colors['emphasis-low']}
          size={ITEM_ICON_SIZE}
        />
      );
    default:
      return (
        <MaterialIcons name="note" color={theme.colors['emphasis-low']} size={ITEM_ICON_SIZE} />
      );
  }
};
