import { captureException } from '@sentry/react-native'
import { useCallback, useMemo, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

import { Button } from '~/components/Button'
import TextInput from '~/components/text-input'
import { Text } from '~/theme'
import { useAuth } from '~/utils/auth-provider'
import { E2E_TESTING } from '~/utils/constants'

const LoginSheet = () => {
  const [authError, setAuthError] = useState<string | null>(null)
  const { signInWithApple, signInWithTestCredentials } = useAuth()
  const [testEmail, setTestEmail] = useState('')
  const [testPassword, setTestPassword] = useState('')
  const canUseTestAuth = E2E_TESTING && signInWithTestCredentials
  const isTestAuthDisabled = !testEmail || !testPassword

  const testFormError = useMemo(() => {
    if (!canUseTestAuth) return null
    if (isTestAuthDisabled) return 'ENTER TEST EMAIL AND PASSWORD.'
    return null
  }, [canUseTestAuth, isTestAuthDisabled])

  const onSignInWithApple = useCallback(async () => {
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

  const onTestSignInClick = useCallback(async () => {
    if (!signInWithTestCredentials) return

    try {
      await signInWithTestCredentials(testEmail.trim(), testPassword)
      setAuthError(null)
    } catch (error: unknown) {
      captureException(error)
      Alert.alert('Test sign in failed', 'Unable to authenticate test user. Check credentials.')
      setAuthError('TEST SIGN IN FAILED. VERIFY CREDENTIALS.')
    }
  }, [signInWithTestCredentials, testEmail, testPassword])

  return (
    <View style={styles.container}>
      {authError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.text}>{authError.toUpperCase()}</Text>
        </View>
      ) : null}
      {canUseTestAuth ? (
        <View style={styles.testAuthContainer}>
          <Text variant="label" color="mutedForeground">
            E2E TEST LOGIN
          </Text>
          <TextInput
            label="Email"
            value={testEmail}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setTestEmail}
            testID="test-auth-email"
          />
          <TextInput
            label="Password"
            value={testPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setTestPassword}
            testID="test-auth-password"
          />
          {testFormError ? <Text style={styles.text}>{testFormError}</Text> : null}
          <Button
            onPress={onTestSignInClick}
            title="[TEST_SIGN_IN]"
            disabled={isTestAuthDisabled}
            testID="test-auth-submit"
          />
        </View>
      ) : null}
      <View style={styles.buttonContainer}>
        <Button onPress={onSignInWithApple} title="[CONTINUE_WITH_APPLE]" />
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
  testAuthContainer: {
    gap: 12,
    marginBottom: 24,
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
