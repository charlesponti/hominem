import { StyleSheet } from 'react-native'
import { theme } from './index'

export const borderStyle = StyleSheet.create({
  noBorder: {
    borderBottomWidth: 0,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  border: {
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 8,
  },
})

export const listStyles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    columnGap: 12,
  },
  text: {
    flex: 1,
    alignItems: 'center',
    fontSize: 14,
    color: theme.colors.secondaryForeground,
  },
})
