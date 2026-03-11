import { useRouter } from 'expo-router'
import type { RelativePathString } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { Button } from '~/components/Button'
import { Text, theme } from '~/theme'

export default function ErrorScreen({ error }: { error: Error }) {
  const router = useRouter()

  return (
    <View style={styles.container}>
      <Text variant="header" color="foreground">
        Something went wrong
      </Text>
      <Text variant="body" color="text-tertiary" style={styles.message}>
        {error?.message || 'An unexpected error occurred'}
      </Text>
      <Button
        variant="primary"
        style={styles.button}
        onPress={() => router.replace('/' as RelativePathString)}
        title="Go Home"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 24,
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
    maxWidth: 300,
  },
  button: {
    marginTop: 24,
    backgroundColor: theme.colors['text-primary'],
  },
})
