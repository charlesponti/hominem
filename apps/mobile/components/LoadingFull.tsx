import type { PropsWithChildren } from 'react'
import { ActivityIndicator, StyleSheet } from 'react-native'

import { Box, theme } from '~/theme'

export const LoadingFull = ({ children }: PropsWithChildren) => {
  return (
    <LoadingContainer>
      {children}
      <ActivityIndicator size="large" color={theme.colors.foreground} />
    </LoadingContainer>
  )
}

export const LoadingContainer = ({ children }: PropsWithChildren) => {
  return <Box style={styles.loading}>{children}</Box>
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.ml_24,
    paddingVertical: theme.spacing.xl_48,
    rowGap: theme.spacing.ml_24,
    backgroundColor: theme.colors.background,
  },
})
