import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, Alert, Pressable, TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { FeatureErrorBoundary } from '~/components/error-boundary';
import { Box, Text } from '~/theme';
import { useAuth } from '~/utils/auth-provider';
import { isValidOtp, normalizeOtp } from '~/utils/auth/validation';
import { Button } from '~/components/Button';
export function VerifyScreen() {
  const { isSignedIn, requestEmailOtp, verifyEmailOtp } = useAuth();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const otpInputRef = useRef<RNTextInput | null>(null);

  const otpDigits = useMemo(() => {
    const normalized = normalizeOtp(otp);
    return Array.from({ length: 6 }, (_, index) => normalized[index] ?? '');
  }, [otp]);

  useEffect(() => {
    if (!email) {
      router.replace('/(auth)');
    }
  }, [email, router]);

  const handleVerify = useCallback(async () => {
    if (!email) {
      setAuthError('Email is required.');
      return;
    }

    const normalizedOtp = normalizeOtp(otp);
    if (!normalizedOtp) {
      setAuthError('Code is required.');
      return;
    }
    if (!isValidOtp(normalizedOtp)) {
      setAuthError('Code must be 6 digits.');
      return;
    }

    try {
      setIsSubmitting(true);
      await verifyEmailOtp({
        email,
        otp: normalizedOtp,
      });
      setAuthError(null);
    } catch (error: unknown) {
      console.error('[mobile-auth] Email OTP verification failed', error);
      Alert.alert('Sign in failed', 'Unable to authenticate. Please try again.');
      setAuthError('There was a problem signing in. Our team is working on it.');
    } finally {
      setIsSubmitting(false);
    }
  }, [email, otp, verifyEmailOtp]);

  const handleOtpChange = useCallback((text: string) => {
    setOtp(normalizeOtp(text));
    setAuthError(null);
    setResendMessage(null);
  }, []);

  const focusOtpInput = useCallback(() => {
    otpInputRef.current?.focus();
  }, []);

  const handleResend = useCallback(async () => {
    if (!email) {
      setAuthError('Email is required.');
      return;
    }

    try {
      setIsResending(true);
      setAuthError(null);
      await requestEmailOtp(email);
      setResendMessage('A new code is on the way.');
      focusOtpInput();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to resend verification code.';
      setAuthError(message);
      setResendMessage(null);
    } finally {
      setIsResending(false);
    }
  }, [email, focusOtpInput, requestEmailOtp]);

  if (isSignedIn) {
    return <Redirect href="/(drawer)/(tabs)/start" />;
  }

  if (!email) {
    return null;
  }

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          bounces={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Box flex={1} testID="auth-verify-screen" style={styles.screen}>
            <View style={styles.hero}>
              <Image source={require('~/assets/icon.png')} style={styles.logo} />
              <Text variant="header" color="foreground" style={styles.title}>
                VERIFY
              </Text>
              <Text variant="body" color="mutedForeground" style={styles.subtitle}>
                Enter the code we sent to your email.
              </Text>
            </View>
            <View style={styles.formContainer}>
              <Text style={styles.heading}>VERIFY</Text>
              <Text style={styles.subheading}>Enter the code we sent to {email}</Text>
              {authError ? (
                <View testID="auth-error-banner" style={styles.errorContainer}>
                  <Text testID="auth-error-text" style={styles.errorText}>{authError.toUpperCase()}</Text>
                </View>
              ) : null}
              <Pressable onPress={focusOtpInput} testID="auth-otp-slots" style={styles.otpPressable}>
                <View style={styles.otpSlots}>
                  {otpDigits.map((digit, index) => {
                    const isActive = index === Math.min(normalizeOtp(otp).length, 5)
                    return (
                      <View
                        key={`otp-slot-${index}`}
                        style={[styles.otpSlot, isActive && !digit ? styles.otpSlotActive : null]}
                        testID={`auth-otp-slot-${index}`}
                      >
                        <Text style={styles.otpSlotText}>{digit || ' '}</Text>
                      </View>
                    )
                  })}
                </View>
                <RNTextInput
                  ref={otpInputRef}
                  testID="auth-otp-input"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={normalizeOtp(otp)}
                  editable={!isSubmitting && !isResending}
                  maxLength={6}
                  caretHidden
                  importantForAutofill="yes"
                  style={styles.overlayOtpInput}
                  onChangeText={handleOtpChange}
                />
              </Pressable>
              {resendMessage ? (
                <Text testID="auth-resend-message" style={styles.resendMessage}>
                  {resendMessage}
                </Text>
              ) : null}
              <Button
                onPress={handleVerify}
                disabled={isSubmitting || isResending}
                isLoading={isSubmitting}
                testID="auth-verify-otp"
                title="VERIFY"
                style={styles.primaryButton}
              />
              <Button
                onPress={handleResend}
                disabled={isSubmitting || isResending}
                isLoading={isResending}
                testID="auth-resend-otp"
                title="RESEND CODE"
                style={styles.secondaryButton}
              />
              <Link href="/(auth)" asChild>
                <View style={styles.secondaryActionContainer}>
                  <Text style={styles.secondaryAction}>USE DIFFERENT EMAIL</Text>
                </View>
              </Link>
            </View>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  screen: {
    backgroundColor: '#000000',
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    rowGap: 24,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 14,
  },
  logo: {
    width: 96,
    height: 96,
    maxWidth: 96,
    maxHeight: 96,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  },
  title: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: 20,
    rowGap: 12,
  },
  heading: {
    color: '#F5F5F5',
    fontSize: 18,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontWeight: '700',
  },
  subheading: {
    color: '#A1A1AA',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontWeight: '500',
  },
  errorContainer: {
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.4)',
    backgroundColor: 'rgba(255, 0, 0, 0.08)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: {
    color: '#FF0000',
    textAlign: 'left',
    fontSize: 14,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontWeight: '600',
  },
  otpPressable: {
    width: '100%',
  },
  otpSlots: {
    flexDirection: 'row',
    columnGap: 8,
    justifyContent: 'space-between',
  },
  otpSlot: {
    flex: 1,
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpSlotActive: {
    borderColor: '#E4E4E7',
  },
  otpSlotText: {
    color: '#F5F5F5',
    fontSize: 22,
    lineHeight: 28,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontWeight: '700',
  },
  overlayOtpInput: {
    position: 'absolute',
    opacity: 0.02,
    width: '100%',
    height: 56,
    top: 0,
    left: 0,
    color: 'transparent',
    backgroundColor: 'transparent',
  },
  resendMessage: {
    color: '#A1A1AA',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontWeight: '500',
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryActionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryAction: {
    color: '#E4E4E7',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontWeight: '600',
  },
});

const VerifyWithErrorBoundary = () => (
  <FeatureErrorBoundary featureName="AuthVerify">
    <VerifyScreen />
  </FeatureErrorBoundary>
);

export default VerifyWithErrorBoundary;
