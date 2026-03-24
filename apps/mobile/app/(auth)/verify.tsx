import { AUTH_COPY, SHERPA_AUTH_CONFIG } from '@hominem/auth';
import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Link } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '~/components/Button';
import { FeatureErrorBoundary } from '~/components/error-boundary';
import TextInput from '~/components/text-input';
import { posthog } from '~/lib/posthog';
import { Box, Text, makeStyles } from '~/theme';
import { useAuth } from '~/utils/auth-provider';
import { isValidOtp, normalizeOtp } from '~/utils/auth/validation';

export function VerifyScreen() {
  const styles = useStyles();
  const { isSignedIn, requestEmailOtp, verifyEmailOtp } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const otpInputRef = useRef<React.ElementRef<typeof TextInput> | null>(null);

  const otpDigits = useMemo(() => {
    const normalized = normalizeOtp(otp);
    return Array.from({ length: 6 }, (_, index) => normalized[index] ?? '');
  }, [otp]);

  useEffect(() => {
    posthog.capture('auth_verify_screen_viewed');
  }, []);

  const handleVerify = useCallback(async () => {
    posthog.capture('auth_verify_pressed');
    if (!email) {
      setAuthError('Email is required.');
      return;
    }

    const normalizedOtp = normalizeOtp(otp);
    if (!normalizedOtp) {
      setAuthError(AUTH_COPY.otpVerification.codeRequiredError);
      return;
    }
    if (!isValidOtp(normalizedOtp)) {
      setAuthError(AUTH_COPY.otpVerification.codeLengthError);
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
        error instanceof Error ? error.message : AUTH_COPY.otpVerification.verifyFailedError;
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, otp, verifyEmailOtp]);

  const handleOtpChange = useCallback((text: string) => {
    const normalized = normalizeOtp(text);
    setOtp(normalized);
    setAuthError(null);
    setResendMessage(null);
    if (normalized.length === 6) {
      posthog.capture('auth_otp_complete');
    }
  }, []);

  const focusOtpInput = useCallback(() => {
    otpInputRef.current?.focus();
  }, []);

  const handleResend = useCallback(async () => {
    posthog.capture('auth_resend_pressed');
    if (!email) {
      setAuthError('Email is required.');
      return;
    }

    try {
      setIsResending(true);
      setAuthError(null);
      await requestEmailOtp(email);
      setResendMessage(AUTH_COPY.otpVerification.resendSuccessMessage);
      focusOtpInput();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : AUTH_COPY.otpVerification.resendFailedError;
      setAuthError(message);
      setResendMessage(null);
    } finally {
      setIsResending(false);
    }
  }, [email, focusOtpInput, requestEmailOtp]);

  if (isSignedIn) {
    return <Redirect href={SHERPA_AUTH_CONFIG.defaultPostAuthDestination as RelativePathString} />;
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
              <Image
                source={require('~/assets/icon.png')}
                contentFit="contain"
                style={styles.logo}
              />
              <Text variant="header" color="foreground" style={styles.title}>
                {AUTH_COPY.otpVerification.title.toUpperCase()}
              </Text>
              <Text variant="body" color="text-tertiary" style={styles.subtitle}>
                {AUTH_COPY.otpVerification.subtitle}
              </Text>
            </View>
            <View style={styles.formContainer}>
              <Text style={styles.heading}>
                {AUTH_COPY.otpVerification.formHeading.toUpperCase()}
              </Text>
              <Text style={styles.subheading}>
                {AUTH_COPY.otpVerification.formSubheading(email)}
              </Text>
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
                <TextInput
                  ref={otpInputRef}
                  containerStyle={styles.overlayOtpContainer}
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
                title={AUTH_COPY.otpVerification.verifyButton.toUpperCase()}
                style={styles.primaryButton}
              />
              <Button
                onPress={handleResend}
                disabled={isSubmitting || isResending}
                isLoading={isResending}
                testID="auth-resend-otp"
                title={AUTH_COPY.otpVerification.resendButton.toUpperCase()}
                style={styles.secondaryButton}
              />
              <Link
                href={'/(auth)' as RelativePathString}
                asChild
                onPress={() => posthog.capture('auth_change_email_pressed')}
              >
                <View style={styles.secondaryActionContainer}>
                  <Text style={styles.secondaryAction}>
                    {AUTH_COPY.otpVerification.changeEmailLink.toUpperCase()}
                  </Text>
                </View>
              </Link>
            </View>
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: t.colors.background,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    screen: {
      backgroundColor: t.colors.background,
      flex: 1,
      paddingHorizontal: t.spacing.m_16,
      paddingTop: t.spacing.m_16,
      paddingBottom: t.spacing.ml_24,
      rowGap: t.spacing.ml_24,
      justifyContent: 'space-between',
    },
    hero: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      rowGap: t.spacing.sm_12,
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
      backgroundColor: t.colors['bg-surface'],
      borderWidth: 1,
      borderColor: t.colors['emphasis-lower'],
      borderRadius: t.borderRadii.md,
      padding: t.spacing.m_16,
      rowGap: t.spacing.sm_12,
    },
    heading: {
      color: t.colors.foreground,
      fontSize: 18,
      fontWeight: '700',
    },
    subheading: {
      color: t.colors['text-tertiary'],
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500',
    },
    errorContainer: {
      borderWidth: 1,
      borderColor: t.colors.destructive,
      backgroundColor: t.colors.muted,
      borderRadius: t.borderRadii.md,
      paddingVertical: t.spacing.sm_12,
      paddingHorizontal: t.spacing.sm_12,
    },
    errorText: {
      color: t.colors.destructive,
      textAlign: 'left',
      fontSize: 14,
      fontWeight: '600',
    },
    otpPressable: {
      width: '100%',
    },
    otpSlots: {
      flexDirection: 'row',
      columnGap: t.spacing.sm_8,
      justifyContent: 'space-between',
    },
    otpSlot: {
      flex: 1,
      minHeight: 56,
      borderRadius: t.borderRadii.md,
      borderWidth: 1,
      borderColor: t.colors['border-focus'],
      backgroundColor: t.colors['bg-surface'],
      alignItems: 'center',
      justifyContent: 'center',
    },
    otpSlotActive: {
      borderColor: t.colors.foreground,
    },
    otpSlotText: {
      color: t.colors.foreground,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '700',
    },
    overlayOtpInput: {
      position: 'absolute',
      opacity: 0.02,
      width: '100%',
      height: 56,
      top: t.spacing.xs_4,
      left: t.spacing.xs_4,
      color: 'transparent',
      backgroundColor: 'transparent',
    },
    overlayOtpContainer: {
      position: 'absolute',
      top: t.spacing.xs_4,
      left: t.spacing.xs_4,
      width: '100%',
      height: 56,
    },
    resendMessage: {
      color: t.colors['text-tertiary'],
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
      borderColor: t.colors['emphasis-lower'],
    },
    secondaryActionContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: t.spacing.sm_12,
    },
    secondaryAction: {
      color: t.colors.foreground,
      fontSize: 12,
      fontWeight: '600',
    },
  }),
);

const VerifyWithErrorBoundary = () => (
  <FeatureErrorBoundary featureName="AuthVerify">
    <VerifyScreen />
  </FeatureErrorBoundary>
);

export default VerifyWithErrorBoundary;
