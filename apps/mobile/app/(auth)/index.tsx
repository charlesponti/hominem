import { AUTH_COPY, SHERPA_AUTH_CONFIG } from '@hominem/auth';
import { Image } from 'expo-image';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '~/components/Button';
import { FeatureErrorBoundary } from '~/components/error-boundary';
import TextInput from '~/components/text-input';
import { Box, Text, makeStyles } from '~/theme';
import { posthog } from '~/lib/posthog';
import { useAuth } from '~/utils/auth-provider';
import { isValidEmail, normalizeEmail } from '~/utils/auth/validation';
import { E2E_TESTING, MOBILE_PASSKEY_ENABLED } from '~/utils/constants';
import { useMobilePasskeyAuth } from '~/utils/use-mobile-passkey-auth';

export function AuthScreen() {
  const styles = useStyles();
  const {
    authError: recoveryError,
    authStatus,
    isSignedIn,
    completePasskeySignIn,
    requestEmailOtp,
    retrySessionRecovery,
  } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useFocusEffect(useCallback(() => {
    posthog.capture('auth_screen_viewed');
  }, []));
  const [authError, setAuthError] = useState<string | null>(null);
  const {
    signIn: signInWithPasskey,
    isLoading: isPasskeyLoading,
    error: passkeyError,
    isSupported: isPasskeySupported,
  } = useMobilePasskeyAuth();

  const handleSendCode = useCallback(async () => {
    posthog.capture('auth_send_code_pressed');
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setAuthError(AUTH_COPY.emailEntry.emailRequiredError);
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      posthog.capture('auth_email_invalid');
      setAuthError(AUTH_COPY.emailEntry.emailInvalidError);
      return;
    }

    try {
      setIsSubmitting(true);
      await requestEmailOtp(normalizedEmail);
      router.replace(
        `/(auth)/verify?email=${encodeURIComponent(normalizedEmail)}` as RelativePathString,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : AUTH_COPY.emailEntry.sendFailedError;
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, requestEmailOtp, router]);

  const handlePasskeySignIn = useCallback(async () => {
    posthog.capture('auth_passkey_pressed');
    try {
      setIsSubmitting(true);
      setAuthError(null);
      const result = await signInWithPasskey();
      if (result) {
        await completePasskeySignIn(result);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : AUTH_COPY.passkey.genericError;
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [completePasskeySignIn, signInWithPasskey]);

  if (isSignedIn) {
    return <Redirect href={SHERPA_AUTH_CONFIG.defaultPostAuthDestination as RelativePathString} />;
  }

  const displayError =
    authError ||
    passkeyError ||
    (authStatus === 'degraded' ? (recoveryError?.message ?? null) : null);
  const canUsePasskeys = MOBILE_PASSKEY_ENABLED && isPasskeySupported;

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
          <Box flex={1} testID="auth-screen" style={styles.screen}>
            <View style={styles.hero}>
              <Image
                source={require('~/assets/icon.png')}
                contentFit="contain"
                style={styles.logo}
              />
              <Text variant="header" color="foreground" style={styles.title}>
                {AUTH_COPY.emailEntry.title.toUpperCase()}
              </Text>
              <Text variant="body" color="text-tertiary" style={styles.subtitle}>
                {AUTH_COPY.emailEntry.subtitle}
              </Text>
            </View>
            <View style={styles.formContainer}>
              <Text style={styles.heading}>{AUTH_COPY.emailEntry.formHeading.toUpperCase()}</Text>
              <Text style={styles.subheading}>{AUTH_COPY.emailEntry.formSubheading}</Text>
              {displayError ? (
                <View testID="auth-error-banner" style={styles.errorContainer}>
                  <Text testID="auth-error-text" style={styles.errorText}>
                    {displayError.toUpperCase()}
                  </Text>
                </View>
              ) : null}
              <TextInput
                testID="auth-email-input"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                editable={!isSubmitting}
                placeholder={AUTH_COPY.emailEntry.emailPlaceholder}
                onChangeText={(text) => {
                  setEmail(text);
                  setAuthError(null);
                }}
                onBlur={() => {
                  if (email.trim()) {
                    posthog.capture('auth_email_entered', {
                      valid: isValidEmail(normalizeEmail(email)),
                    });
                  }
                }}
              />
              <Button
                onPress={handleSendCode}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                testID="auth-send-otp"
                title={AUTH_COPY.emailEntry.submitButton.toUpperCase()}
                style={styles.primaryButton}
              />
              {authStatus === 'degraded' && recoveryError ? (
                <Button
                  onPress={() => {
                    void retrySessionRecovery();
                  }}
                  disabled={isSubmitting}
                  testID="auth-retry-recovery"
                  title="RETRY SESSION RECOVERY"
                  style={styles.secondaryButton}
                />
              ) : null}
              {canUsePasskeys ? (
                <Button
                  onPress={handlePasskeySignIn}
                  disabled={isSubmitting}
                  isLoading={isPasskeyLoading}
                  style={styles.passkeyButton}
                  testID="auth-passkey-button"
                  title={
                    isPasskeyLoading
                      ? AUTH_COPY.emailEntry.passkeyLoadingButton.toUpperCase()
                      : AUTH_COPY.emailEntry.passkeyButton.toUpperCase()
                  }
                />
              ) : null}
              {E2E_TESTING && MOBILE_PASSKEY_ENABLED ? (
                <Pressable
                  onPress={async () => {
                    try {
                      setIsSubmitting(true);
                      setAuthError(null);
                      const result = await signInWithPasskey('e2e-success');
                      if (result) {
                        await completePasskeySignIn(result);
                      }
                    } catch (error: unknown) {
                      const message =
                        error instanceof Error ? error.message : AUTH_COPY.passkey.genericError;
                      setAuthError(message);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  style={styles.e2ePasskeyAction}
                  testID="auth-e2e-passkey-success"
                />
              ) : null}
              {E2E_TESTING && MOBILE_PASSKEY_ENABLED ? (
                <Pressable
                  onPress={async () => {
                    try {
                      setIsSubmitting(true);
                      setAuthError(null);
                      await signInWithPasskey('e2e-cancel');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  style={styles.e2ePasskeyActionAlt}
                  testID="auth-e2e-passkey-cancel"
                />
              ) : null}
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
    primaryButton: {
      width: '100%',
    },
    secondaryButton: {
      width: '100%',
    },
    passkeyButton: {
      width: '100%',
      paddingVertical: t.spacing.sm_12,
      borderRadius: t.borderRadii.md,
      borderWidth: 1,
      borderColor: t.colors['emphasis-lower'],
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    passkeyButtonText: {
      color: t.colors['text-tertiary'],
      fontSize: 14,
      fontWeight: '600',
    },
    e2ePasskeyAction: {
      position: 'absolute',
      top: t.spacing.xs_4,
      right: t.spacing.xs_4,
      width: 16,
      height: 16,
      opacity: 0.02,
    },
    e2ePasskeyActionAlt: {
      position: 'absolute',
      top: t.spacing.ml_24,
      right: t.spacing.xs_4,
      width: 16,
      height: 16,
      opacity: 0.02,
    },
  }),
);

const AuthWithErrorBoundary = () => (
  <FeatureErrorBoundary featureName="Auth">
    <AuthScreen />
  </FeatureErrorBoundary>
);

export default AuthWithErrorBoundary;
