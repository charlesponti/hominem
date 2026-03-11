import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Link } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '~/components/Button';
import { FeatureErrorBoundary } from '~/components/error-boundary';
import { Box, Text, theme as appTheme } from '~/theme';
import { useAuth } from '~/utils/auth-provider';
import { isValidOtp, normalizeOtp } from '~/utils/auth/validation';

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
      router.replace('/(auth)' as RelativePathString);
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
      const message =
        error instanceof Error
          ? error.message
          : 'There was a problem signing in. Our team is working on it.';
      setAuthError(message);
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
      const message =
        error instanceof Error ? error.message : 'Unable to resend verification code.';
      setAuthError(message);
      setResendMessage(null);
    } finally {
      setIsResending(false);
    }
  }, [email, focusOtpInput, requestEmailOtp]);

  if (isSignedIn) {
    return <Redirect href={"/(protected)/(tabs)/start" as RelativePathString} />;
  }

  if (!email) {
    return null;
  }

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          bounces={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Box flex={1} testID="auth-verify-screen" style={styles.screen}>
            <View style={styles.hero}>
              <Image source={require('~/assets/icon.png')} contentFit="contain" style={styles.logo} />
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
                  <Text testID="auth-error-text" style={styles.errorText}>
                    {authError.toUpperCase()}
                  </Text>
                </View>
              ) : null}
              <Pressable
                onPress={focusOtpInput}
                testID="auth-otp-slots"
                style={styles.otpPressable}
              >
                <View style={styles.otpSlots}>
                  {otpDigits.map((digit, index) => {
                    const isActive = index === Math.min(normalizeOtp(otp).length, 5);
                    return (
                      <View
                        key={`otp-slot-${index}`}
                        style={[styles.otpSlot, isActive && !digit ? styles.otpSlotActive : null]}
                        testID={`auth-otp-slot-${index}`}
                      >
                        <Text style={styles.otpSlotText}>{digit || ' '}</Text>
                      </View>
                    );
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
              <Link href={"/(auth)" as RelativePathString} asChild>
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
    backgroundColor: appTheme.colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  screen: {
    backgroundColor: appTheme.colors.background,
    flex: 1,
    paddingHorizontal: appTheme.spacing.m_16,
    paddingTop: appTheme.spacing.m_16,
    paddingBottom: appTheme.spacing.ml_24,
    rowGap: appTheme.spacing.ml_24,
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
  },
  title: {},
  formContainer: {
    width: '100%',
    backgroundColor: appTheme.colors['bg-surface'],
    borderWidth: 1,
    borderColor: appTheme.colors['emphasis-lower'],
    borderRadius: 16,
    padding: appTheme.spacing.m_16,
    rowGap: appTheme.spacing.sm_12,
  },
  heading: {
    color: appTheme.colors.foreground,
    fontSize: 18,
    fontWeight: '700',
  },
  subheading: {
    color: appTheme.colors.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  errorContainer: {
    borderWidth: 1,
    borderColor: appTheme.colors.destructive,
    backgroundColor: appTheme.colors.muted,
    borderRadius: appTheme.borderRadii.sm_6,
    paddingVertical: 10,
    paddingHorizontal: appTheme.spacing.sm_12,
  },
  errorText: {
    color: appTheme.colors.destructive,
    textAlign: 'left',
    fontSize: 14,
    fontWeight: '600',
  },
  otpPressable: {
    width: '100%',
  },
  otpSlots: {
    flexDirection: 'row',
    columnGap: appTheme.spacing.s_8,
    justifyContent: 'space-between',
  },
  otpSlot: {
    flex: 1,
    minHeight: 56,
    borderRadius: appTheme.borderRadii.md_10,
    borderWidth: 1,
    borderColor: appTheme.colors['border-focus'],
    backgroundColor: appTheme.colors['bg-surface'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpSlotActive: {
    borderColor: appTheme.colors.foreground,
  },
  otpSlotText: {
    color: appTheme.colors.foreground,
    fontSize: 22,
    lineHeight: 28,
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
    color: appTheme.colors.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  primaryButton: {
    width: '100%',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderColor: appTheme.colors['emphasis-lower'],
  },
  secondaryActionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryAction: {
    color: appTheme.colors.foreground,
    fontSize: 12,
    fontWeight: '600',
  },
});

const VerifyWithErrorBoundary = () => (
  <FeatureErrorBoundary featureName="AuthVerify">
    <VerifyScreen />
  </FeatureErrorBoundary>
);

export default VerifyWithErrorBoundary;
