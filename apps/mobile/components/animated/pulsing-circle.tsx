import { StyleSheet, View } from 'react-native'

import { theme } from '~/theme'

export const PulsingCircle = () => {
  return <View style={styles.circle} />
}

const styles = StyleSheet.create({
  circle: {
    width: 42,
    height: 42,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.muted,
  },
})
