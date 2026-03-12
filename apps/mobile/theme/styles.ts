import { StyleSheet } from 'react-native';

import { theme } from './index';

export const borderStyle = StyleSheet.create({
  noBorder: {
    borderBottomWidth: 0,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors['border-default'],
  },
  border: {
    borderColor: theme.colors['border-default'],
    borderWidth: 1,
    borderRadius: theme.borderRadii.sm_6,
  },
});

export const listStyles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.ml_24,
    paddingHorizontal: theme.spacing.m_16,
    alignItems: 'center',
    flexDirection: 'row',
    columnGap: theme.spacing.sm_12,
  },
  text: {
    flex: 1,
    alignItems: 'center',
    fontSize: 14,
    color: theme.colors['text-secondary'],
  },
});
