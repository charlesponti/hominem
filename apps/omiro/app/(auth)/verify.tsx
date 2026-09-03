import { maskEmail } from '@ponti-studios/auth/shared/mask-email';
import type { RelativePathString } from 'expo-router';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { FeatureErrorBoundary } from '~/components/error-boundary/FeatureErrorBoundary';
import { useAppTheme, useStyles } from '~/components/theme';
import { AnimatedCanvasButton } from '~/components/ui/animated-canvas-button';
import { Button } from '~/components/ui/button';
import AppIcon from '~/components/ui/icon';
import { IconChip } from '~/components/ui/icon-chip';
import { OtpInput } from '~/components/ui/otp-field';
import { CHAT_AUTH_CONFIG } from '~/config/auth';
import { OTP_EXPIRES_SECONDS } from '~/config/auth-protocol';
import { useAuth } from '~/services/auth/auth-provider';
import { useEmailAuth } from '~/services/auth/use-email-auth';
import { normalizeOtp } from '~/services/auth/validation';
import { posthog } from '~/services/posthog';
import t from '~/translations';

import { authSharedStyles } from './_shared-styles';

function countdownColor(
  secondsLeft: number,
  destructive: string,
  warning: string,
  textSecondary: string,
) {
  if (secondsLeft === 0 || secondsLeft < 20) {
    return destructive;
  }
  if (secondsLeft < 60) {
    return warning;
  }
  return textSecondary;
}

function formatCountdown(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const OTP_PROGRESS_MESSAGES = [
  'Enter your 6-digit code',
  'Nice start — 5 more to go',
  'Keep going — 4 left',
  'Halfway there!',
  'So close — 2 more',
  'Just one more digit!',
];

function getOtpProgressMessage(digitsEntered: number) {
  return OTP_PROGRESS_MESSAGES[Math.min(digitsEntered, OTP_PROGRESS_MESSAGES.length - 1)];
}

function resolveTokenSentAt(sentAt?: string) {
  const parsedSentAt = sentAt ? Number(sentAt) : NaN;
  return Number.isFinite(parsedSentAt) ? parsedSentAt : Date.now();
}

function resolveSecondsLeft(tokenSentAt: number, now = Date.now()) {
  return Math.max(0, OTP_EXPIRES_SECONDS - Math.floor((now - tokenSentAt) / 1000));
}

function resolveAutoSubmitInput({
  resolvedEmail,
  token,
}: {
  resolvedEmail: string;
  token?: string;
}) {
  const normalizedToken = normalizeOtp(token ?? '');
  if (!resolvedEmail || normalizedToken.length !== 6) {
    return null;
  }

  return {
    normalizedToken,
    submitKey: `${resolvedEmail}:${normalizedToken}`,
  };
}

// react-doctor-disable-next-line no-giant-component -- auth verification keeps OTP timing, resend, auto-submit, and recovery states together.
function VerifyScreen() {
  const router = useRouter();
  const { isSignedIn, requestEmailOtp, verifyEmailOtp } = useAuth();
  const {
    email: emailParam,
    token: tokenParam,
    sentAt: sentAtParam,
  } = useLocalSearchParams<{
    email: string;
    token?: string;
    sentAt?: string;
  }>();
  const resolvedEmail = emailParam ?? '';
  const initialTokenSentAt = React.useMemo(() => resolveTokenSentAt(sentAtParam), [sentAtParam]);
  const autoSubmitKeyRef = React.useRef<string | null>(null);
  const [verifySucceeded, setVerifySucceeded] = React.useState(false);
  const {
    otp,
    setOtp,
    error: authError,
    isSubmitting,
    isResending,
    handleVerifyOtp,
    handleResendOtp,
  } = useEmailAuth({
    verifyOtp: async (email, code) => {
      await verifyEmailOtp({ email, otp: normalizeOtp(code) });
      setVerifySucceeded(true);
    },
    resendOtp: async (email) => {
      await requestEmailOtp(email);
    },
  });
  const normalizedOtp = normalizeOtp(otp);

  const [tokenSentAt, setTokenSentAt] = React.useState(initialTokenSentAt);
  const [secondsLeft, setSecondsLeft] = React.useState(() =>
    resolveSecondsLeft(initialTokenSentAt),
  );

  React.useEffect(() => {
    const id = setInterval(() => {
      const left = resolveSecondsLeft(tokenSentAt);
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [tokenSentAt]);

  // Wait a beat before redirecting so the success state is actually visible
  React.useEffect(() => {
    if (!verifySucceeded) {
      return;
    }
    const id = setTimeout(() => {
      router.replace(CHAT_AUTH_CONFIG.defaultPostAuthDestination as RelativePathString);
    }, 900);
    return () => clearTimeout(id);
  }, [verifySucceeded, router]);

  const {
    primary,
    destructive,
    warning,
    mutedForeground: textSecondary,
    success,
  } = useAppTheme().colors;
  const styles = useStyles((theme) => ({
    ...authSharedStyles(theme),
    successContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
    successContent: { alignItems: 'center', gap: 16 },
    successMessage: { ...theme.textVariants.title2, color: theme.colors.foreground },
    emailRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
    codeSentLabel: { ...theme.textVariants.subhead, color: theme.colors.mutedForeground },
    emailChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      backgroundColor: theme.colors.card,
    },
    emailText: { ...theme.textVariants.body, fontWeight: '500', color: theme.colors.foreground },
    otpContainer: { gap: 16, alignItems: 'center' },
    error: { ...theme.textVariants.footnote, textAlign: 'center', color: theme.colors.destructive },
    verifyButtonContainer: {
      position: 'relative',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    resendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.card,
    },
    resendText: { ...theme.textVariants.caption1, fontWeight: '600' },
    busy: { opacity: 0.6 },
  }));

  const verifyButtonStyle = useAnimatedStyle(
    () => ({
      opacity: withTiming(normalizedOtp.length === 6 ? 1 : 0, { duration: 200 }),
    }),
    [normalizedOtp.length],
  );

  React.useEffect(() => {
    const autoSubmitInput = resolveAutoSubmitInput({
      resolvedEmail,
      token: tokenParam,
    });
    if (!autoSubmitInput || autoSubmitKeyRef.current === autoSubmitInput.submitKey) {
      return;
    }

    autoSubmitKeyRef.current = autoSubmitInput.submitKey;
    setOtp(autoSubmitInput.normalizedToken);
    posthog.capture('auth_verify_link_opened');
    void handleVerifyOtp(resolvedEmail, autoSubmitInput.normalizedToken);
  }, [handleVerifyOtp, resolvedEmail, setOtp, tokenParam]);

  const handleChangeEmail = React.useCallback(() => {
    posthog.capture('auth_change_email_pressed');
    router.replace('/(auth)' as RelativePathString);
  }, [router]);
  const handleVerifyPress = React.useCallback(() => {
    posthog.capture('auth_verify_pressed');
    return handleVerifyOtp(resolvedEmail, normalizedOtp);
  }, [handleVerifyOtp, normalizedOtp, resolvedEmail]);
  const handleResendPress = React.useCallback(async () => {
    posthog.capture('auth_resend_pressed');
    await handleResendOtp(resolvedEmail);
    setTokenSentAt(Date.now());
  }, [handleResendOtp, resolvedEmail]);

  if (isSignedIn && !verifySucceeded) {
    return <Redirect href={CHAT_AUTH_CONFIG.defaultPostAuthDestination as RelativePathString} />;
  }

  if (!resolvedEmail) {
    return <Redirect href={'/(auth)' as RelativePathString} />;
  }

  const isBusy = isSubmitting || isResending;

  if (verifySucceeded) {
    return (
      <View style={styles.successContainer}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.successContent}>
          <IconChip
            icon="checkmark.circle.fill"
            size={72}
            radius={24}
            iconSize={32}
            tintColor={success}
          />
          <Text style={styles.successMessage}>{t.auth.verify.signedIn}</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScrollView
        testID="auth-verify-screen"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 80,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.form}>
            <Animated.View entering={FadeIn.duration(400)}>
              <IconChip icon="lock.shield" />
            </Animated.View>

            <Animated.View entering={FadeIn.duration(400).delay(60)} style={styles.header}>
              <Text style={styles.title}>{t.auth.verify.title}</Text>
              <View style={styles.emailRow}>
                <Text style={styles.codeSentLabel}>{t.auth.verify.codeSentTo}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={handleChangeEmail}
                  style={({ pressed }) => [styles.emailChip, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <Text style={styles.emailText}>{maskEmail(resolvedEmail)}</Text>
                  <AppIcon name="pencil" size={11} tintColor={textSecondary} />
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(400).delay(120)} style={styles.otpContainer}>
              <View style={isBusy ? styles.busy : undefined}>
                <OtpInput
                  testID="auth-otp-input"
                  value={normalizedOtp}
                  onChangeText={(value) => setOtp(normalizeOtp(value))}
                  onSubmitEditing={() => {
                    if (normalizedOtp.length === 6) {
                      void handleVerifyPress();
                    }
                  }}
                  editable={!isBusy}
                  error={Boolean(authError)}
                  autoFocus
                  accessibilityLabel={t.auth.verify.oneTimeVerificationCodeA11y}
                />
              </View>

              {authError ? (
                <Animated.View entering={FadeIn.duration(200)}>
                  <Text
                    testID="auth-otp-message"
                    accessibilityLiveRegion="polite"
                    style={styles.error}
                  >
                    {authError}
                  </Text>
                </Animated.View>
              ) : null}

              {/* border fills in clockwise as digits go in, then fades into the
                  Verify button once all 6 are there -- no layout shift */}
              <AnimatedCanvasButton
                progress={normalizedOtp.length / 6}
                style={styles.verifyButtonContainer}
              >
                {normalizedOtp.length < 6 && !authError && (
                  <View style={styles.progressHelper}>
                    {normalizedOtp.length > 0 ? <Text style={styles.progressArrow}>↑</Text> : null}
                    <Text style={styles.progressMessage}>
                      {getOtpProgressMessage(normalizedOtp.length)}
                    </Text>
                  </View>
                )}

                <Animated.View
                  style={[{ position: 'absolute', width: '100%' }, verifyButtonStyle]}
                  pointerEvents={normalizedOtp.length === 6 ? 'auto' : 'none'}
                >
                  <Button
                    testID="auth-verify-otp"
                    label={t.auth.verify.verifyButton}
                    onPress={() => {
                      void handleVerifyPress();
                    }}
                    disabled={isSubmitting || normalizedOtp.length !== 6}
                    variant="primary"
                  />
                </Animated.View>
              </AnimatedCanvasButton>

              <Pressable
                testID="auth-resend-otp"
                onPress={() => {
                  void handleResendPress();
                }}
                disabled={isBusy || secondsLeft > 0}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.resendButton,
                  { opacity: pressed && secondsLeft === 0 ? 0.65 : 1 },
                ]}
              >
                <AppIcon
                  name={secondsLeft === 0 ? 'arrow.clockwise' : 'clock'}
                  size={11}
                  tintColor={
                    secondsLeft === 0
                      ? primary
                      : countdownColor(secondsLeft, destructive, warning, textSecondary)
                  }
                />
                <Text
                  style={[
                    styles.resendText,
                    {
                      color:
                        secondsLeft === 0
                          ? primary
                          : countdownColor(secondsLeft, destructive, warning, textSecondary),
                    },
                  ]}
                  accessibilityLabel={
                    secondsLeft === 0
                      ? t.auth.verify.resendButton
                      : t.auth.verify.timeRemainingA11y(secondsLeft)
                  }
                >
                  {secondsLeft === 0 ? t.auth.verify.resendButton : formatCountdown(secondsLeft)}
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const VerifyWithErrorBoundary = () => (
  <FeatureErrorBoundary featureName="AuthVerify">
    <VerifyScreen />
  </FeatureErrorBoundary>
);

export default VerifyWithErrorBoundary;
