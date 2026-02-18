import { captureException } from '@sentry/react-native'
import { useCallback, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { Button } from '~/components/Button'
import { Text } from '~/theme'
import { useAuth } from '~/utils/auth-provider'

const LoginSheet = () => {
  const [authError, setAuthError] = useState<string | null>(null)
  const { signInWithApple } = useAuth()

  const onSignInClick = useCallback(async () => {
    try {
      await signInWithApple()
      setAuthError(null)
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'ERR_REQUEST_CANCELED') {
        return
      }

      captureException(error)
      Alert.alert('Sign in failed', 'Unable to authenticate. Please try again.')
      setAuthError('There was a problem signing in. Our team is working on it.')
    }
  }, [signInWithApple])

  return (
    <View style={styles.container}>
      {authError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.text}>{authError.toUpperCase()}</Text>
        </View>
      ) : null}
      <View style={styles.buttonContainer}>
        <Button onPress={onSignInClick} title="[CONTINUE_WITH_APPLE]" />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingVertical: 48,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 24,
    backgroundColor: '#000000',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  text: {
    color: '#FF0000',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
    fontFamily: 'Geist Mono',
    fontWeight: '600',
  },
})

export default LoginSheet
