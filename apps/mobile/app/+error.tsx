import { useRouter } from 'expo-router'
import type { RelativePathString } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'

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
      <Pressable style={styles.button} onPress={() => router.replace('/' as RelativePathString)} accessibilityRole="button">
        <Text variant="label" color="white">
          Go Home
        </Text>
      </Pressable>
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors['text-primary'],
    borderRadius: 8,
  },
})
