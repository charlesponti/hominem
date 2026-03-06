import { useCallback, useMemo, useState } from 'react'
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native'

import { Button } from '~/components/Button'
import TextInput from '~/components/text-input'
import { Text } from '~/theme'
import { useAuth } from '~/utils/auth-provider'

const LoginSheet = () => {
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [isOtpRequested, setIsOtpRequested] = useState(false)
  const { requestEmailOtp, verifyEmailOtp } = useAuth()
  const primaryButtonTitle = useMemo(() => (isOtpRequested ? '[VERIFY_CODE]' : '[SEND_CODE]'), [isOtpRequested])

  const onRequestOtp = useCallback(async () => {
    if (!email.trim()) {
      setAuthError('Email is required.')
      return
    }

    try {
      setIsSubmitting(true)
      await requestEmailOtp(email.trim())
      setIsOtpRequested(true)
      setAuthError(null)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to send verification code.'
      console.error('[mobile-auth] Email OTP request failed', error)
      Alert.alert('Sign in failed', message)
      setAuthError('There was a problem sending your code. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [email, requestEmailOtp])

  const onVerifyOtp = useCallback(async () => {
    if (!email.trim()) {
      setAuthError('Email is required.')
      return
    }
    if (!otp.trim()) {
      setAuthError('Code is required.')
      return
    }

    try {
      setIsSubmitting(true)
      await verifyEmailOtp({
        email: email.trim(),
        otp: otp.trim(),
      })
      setAuthError(null)
    } catch (error: unknown) {
      console.error('[mobile-auth] Email OTP verification failed', error)
      Alert.alert('Sign in failed', 'Unable to authenticate. Please try again.')
      setAuthError('There was a problem signing in. Our team is working on it.')
    } finally {
      setIsSubmitting(false)
    }
  }, [email, otp, verifyEmailOtp])

  const onResetFlow = useCallback(() => {
    setIsOtpRequested(false)
    setOtp('')
    setAuthError(null)
  }, [])

  const onPrimaryAction = useCallback(async () => {
    if (isOtpRequested) {
      await onVerifyOtp()
      return
    }
    await onRequestOtp()
  }, [isOtpRequested, onRequestOtp, onVerifyOtp])

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>SIGN IN</Text>
      <Text style={styles.subheading}>
        {isOtpRequested ? 'Enter the code we sent to your email.' : 'Use your email to receive a one-time code.'}
      </Text>
      {authError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{authError.toUpperCase()}</Text>
        </View>
      ) : null}
      <View style={styles.formContainer}>
        <TextInput
          testID="auth-email-input"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          editable={!isSubmitting && !isOtpRequested}
          placeholder="EMAIL"
          onChangeText={setEmail}
        />
        {isOtpRequested ? (
          <TextInput
            testID="auth-otp-input"
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            value={otp}
            editable={!isSubmitting}
            placeholder="CODE"
            onChangeText={setOtp}
          />
        ) : null}
      </View>
      <View style={styles.buttonContainer}>
        <Button
          onPress={onPrimaryAction}
          disabled={isSubmitting}
          isLoading={isSubmitting}
          testID={isOtpRequested ? 'auth-verify-otp' : 'auth-send-otp'}
          title={primaryButtonTitle}
          style={styles.primaryButton}
        />
        {isOtpRequested ? (
          <TouchableOpacity disabled={isSubmitting} onPress={onResetFlow}>
            <Text style={styles.secondaryAction}>USE_DIFFERENT_EMAIL</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 20,
    rowGap: 12,
  },
  errorContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.4)',
    backgroundColor: 'rgba(255, 0, 0, 0.08)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 10,
  },
  formContainer: {
    rowGap: 12,
  },
  heading: {
    color: '#F5F5F5',
    fontSize: 18,
    fontFamily: 'Geist Mono',
    fontWeight: '700',
  },
  subheading: {
    color: '#A1A1AA',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Geist Mono',
    fontWeight: '500',
  },
  errorText: {
    color: '#FF0000',
    textAlign: 'left',
    fontSize: 14,
    fontFamily: 'Geist Mono',
    fontWeight: '600',
  },
  primaryButton: {
    width: '100%',
  },
  secondaryAction: {
    color: '#E4E4E7',
    fontSize: 12,
    fontFamily: 'Geist Mono',
    fontWeight: '600',
  },
})

export default LoginSheet
