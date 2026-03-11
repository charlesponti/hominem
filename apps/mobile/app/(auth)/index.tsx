import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
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
import { Box, Text, theme as appTheme } from '~/theme';
import { useAuth } from '~/utils/auth-provider';
import { isValidEmail, normalizeEmail } from '~/utils/auth/validation';
import { E2E_TESTING, MOBILE_PASSKEY_ENABLED } from '~/utils/constants';
import { useMobilePasskeyAuth } from '~/utils/use-mobile-passkey-auth';

export function AuthScreen() {
  const { isSignedIn, completePasskeySignIn, requestEmailOtp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const {
    signIn: signInWithPasskey,
    isLoading: isPasskeyLoading,
    error: passkeyError,
    isSupported: isPasskeySupported,
  } = useMobilePasskeyAuth();

  const handleSendCode = useCallback(async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setAuthError('Email is required.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setAuthError('Enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await requestEmailOtp(normalizedEmail);
      // Navigate to verify screen after OTP is sent
      // Note: Using setTimeout to bypass static route typing for newly added route
      const verifyPath = '/(auth)/verify?email=' + encodeURIComponent(normalizedEmail);
      setTimeout(() => {
        (router as typeof router & { replace(path: string): void }).replace(verifyPath);
      }, 0);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to send verification code.';
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [email, requestEmailOtp, router]);

  const handlePasskeySignIn = useCallback(async () => {
    try {
      setIsSubmitting(true);
      setAuthError(null);
      const result = await signInWithPasskey();
      if (result) {
        await completePasskeySignIn(result);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Passkey sign-in failed.';
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [completePasskeySignIn, signInWithPasskey]);

  if (isSignedIn) {
    return <Redirect href={"/(protected)/(tabs)/start" as RelativePathString} />;
  }

  const displayError = authError || passkeyError;
  const canUsePasskeys = MOBILE_PASSKEY_ENABLED && isPasskeySupported

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
              <Image source={require('~/assets/icon.png')} contentFit="contain" style={styles.logo} />
              <Text variant="header" color="foreground" style={styles.title}>
                WELCOME
              </Text>
              <Text variant="body" color="mutedForeground" style={styles.subtitle}>
                Sign in with your email and one-time code.
              </Text>
            </View>
            <View style={styles.formContainer}>
              <Text style={styles.heading}>SIGN IN</Text>
              <Text style={styles.subheading}>Use your email to receive a one-time code.</Text>
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
                placeholder="EMAIL"
                onChangeText={(text) => {
                  setEmail(text);
                  setAuthError(null);
                }}
              />
              <Button
                onPress={handleSendCode}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                testID="auth-send-otp"
                title="SEND_CODE"
                style={styles.primaryButton}
              />
              {canUsePasskeys ? (
                <Pressable
                  onPress={handlePasskeySignIn}
                  disabled={isSubmitting}
                  style={styles.passkeyButton}
                  testID="auth-passkey-button"
                >
                  <Text style={styles.passkeyButtonText}>
                    {isPasskeyLoading ? 'AUTHENTICATING...' : 'USE PASSKEY'}
                  </Text>
                </Pressable>
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
                        error instanceof Error ? error.message : 'Passkey sign-in failed.';
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
  primaryButton: {
    width: '100%',
  },
  passkeyButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: appTheme.borderRadii.sm_6,
    borderWidth: 1,
    borderColor: appTheme.colors['emphasis-lower'],
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passkeyButtonText: {
    color: appTheme.colors.mutedForeground,
    fontSize: 14,
    fontWeight: '600',
  },
  e2ePasskeyAction: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    opacity: 0.02,
  },
  e2ePasskeyActionAlt: {
    position: 'absolute',
    top: 20,
    right: 0,
    width: 16,
    height: 16,
    opacity: 0.02,
  },
});

const AuthWithErrorBoundary = () => (
  <FeatureErrorBoundary featureName="Auth">
    <AuthScreen />
  </FeatureErrorBoundary>
);

export default AuthWithErrorBoundary;
