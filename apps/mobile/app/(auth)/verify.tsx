import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useCallback, useEffect } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { FeatureErrorBoundary } from '~/components/error-boundary';
import { Box, Text } from '~/theme';
import { useAuth } from '~/utils/auth-provider';
import { isValidOtp, normalizeOtp } from '~/utils/auth/validation';
import { Button } from '~/components/Button';
import TextInput from '~/components/text-input';

function Verify() {
  const { isSignedIn, verifyEmailOtp } = useAuth();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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
              <TextInput
                testID="auth-otp-input"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                value={otp}
                editable={!isSubmitting}
                placeholder="CODE"
                onChangeText={(text) => {
                  setOtp(text);
                  setAuthError(null);
                }}
              />
              <Button
                onPress={handleVerify}
                disabled={isSubmitting}
                isLoading={isSubmitting}
                testID="auth-verify-otp"
                title="VERIFY"
                style={styles.primaryButton}
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
  primaryButton: {
    width: '100%',
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
    <Verify />
  </FeatureErrorBoundary>
);

export default VerifyWithErrorBoundary;
