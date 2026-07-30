import { maskEmail } from '@ponti-studios/auth/shared/mask-email';
import type { RelativePathString } from 'expo-router';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useThemeColors } from '~/components/theme';
import { CHAT_AUTH_CONFIG } from '~/config/auth';
import { OTP_EXPIRES_SECONDS } from '~/config/auth-protocol';
import { readPendingAuthEmail } from '~/services/auth/pending-email';
import t from '~/translations';

import { FeatureErrorBoundary } from '../../components/error-boundary/FeatureErrorBoundary';
import { Button } from '../../components/ui/button';
import AppIcon from '../../components/ui/icon';
import { IconChip } from '../../components/ui/icon-chip';
import { OtpInput } from '../../components/ui/otp-input';
import { useAuth } from '../../services/auth/auth-provider';
import { useEmailAuth } from '../../services/auth/use-email-auth';
import { normalizeOtp } from '../../services/auth/validation';
import { posthog } from '../../services/posthog';

function countdownColor(secondsLeft: number, themeColors: ReturnType<typeof useThemeColors>) {
  if (secondsLeft === 0 || secondsLeft < 20) return themeColors.destructive;
  if (secondsLeft < 60) return themeColors.warning;
  return themeColors['text-secondary'];
}

function formatCountdown(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function resolveTokenSentAt(sentAt?: string) {
  const parsedSentAt = sentAt ? Number(sentAt) : NaN;
  return Number.isFinite(parsedSentAt) ? parsedSentAt : Date.now();
}

function resolveSecondsLeft(tokenSentAt: number, now = Date.now()) {
  return Math.max(0, OTP_EXPIRES_SECONDS - Math.floor((now - tokenSentAt) / 1000));
}

const useStyles = makeStyles(() => ({
  container: {
    flex: 1,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContent: {
    alignItems: 'center',
    gap: 16,
  },
  successText: {
    fontSize: 22,
    fontWeight: '700',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 80,
  },
  contentShell: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: 18,
  },
  copyBlock: {
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  emailChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  helperText: {
    fontSize: 15,
    lineHeight: 20,
  },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  emailChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  formSection: {
    gap: 16,
    alignItems: 'center',
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countdown: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  verifyButtonWrap: {
    overflow: 'hidden',
  },
  tertiaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
}));

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

function VerifyScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = useStyles();
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
  const resolvedEmail = emailParam ?? readPendingAuthEmail();
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
    sendOtp: async () => {},
    verifyOtp: async (email, code) => {
      await verifyEmailOtp({ email, otp: normalizeOtp(code) });
      setVerifySucceeded(true);
    },
    resendOtp: async (email) => {
      await requestEmailOtp(email);
    },
  });
  const normalizedOtp = normalizeOtp(otp);

  // Countdown
  const [tokenSentAt, setTokenSentAt] = React.useState(initialTokenSentAt);
  const [secondsLeft, setSecondsLeft] = React.useState(() =>
    resolveSecondsLeft(initialTokenSentAt),
  );

  React.useEffect(() => {
    const id = setInterval(() => {
      const left = resolveSecondsLeft(tokenSentAt);
      setSecondsLeft(left);
      if (left === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [tokenSentAt]);

  // Success state — brief pause before redirect
  React.useEffect(() => {
    if (!verifySucceeded) return;
    const id = setTimeout(() => {
      router.replace(CHAT_AUTH_CONFIG.defaultPostAuthDestination as RelativePathString);
    }, 900);
    return () => clearTimeout(id);
  }, [verifySucceeded, router]);

  // Animations
  const verifyButtonStyle = useAnimatedStyle(
    () => ({
      opacity: withTiming(normalizedOtp.length === 6 ? 1 : 0, { duration: 36 }),
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
      <View
        style={[
          styles.container,
          styles.successContainer,
          { backgroundColor: themeColors['background'] },
        ]}
      >
        <Animated.View entering={FadeIn.duration(300)} style={styles.successContent}>
          <IconChip
            icon="checkmark.circle.fill"
            size={72}
            radius={24}
            iconSize={32}
            tintColor={themeColors.success}
          />
          <Text style={[styles.successText, { color: themeColors['text-primary'] }]}>
            {t.auth.verify.signedIn}
          </Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors['background'] }]}
      behavior="padding"
    >
      <ScrollView
        testID="auth-verify-screen"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentShell}>
          <View style={styles.card}>
            <Animated.View entering={FadeInDown.duration(400).springify().damping(16)}>
              <IconChip icon="lock.shield" />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(400).delay(60).springify().damping(16)}
              style={styles.copyBlock}
            >
              <Text style={[styles.title, { color: themeColors['text-primary'] }]}>
                {t.auth.verify.title}
              </Text>
              <View style={styles.emailChipRow}>
                <Text style={[styles.helperText, { color: themeColors['text-secondary'] }]}>
                  {t.auth.verify.codeSentTo}
                </Text>
                <Pressable
                  hitSlop={8}
                  onPress={handleChangeEmail}
                  style={({ pressed }) => [
                    styles.emailChip,
                    { backgroundColor: themeColors['card'], opacity: pressed ? 0.65 : 1 },
                  ]}
                >
                  <Text style={[styles.emailChipText, { color: themeColors['text-primary'] }]}>
                    {maskEmail(resolvedEmail)}
                  </Text>
                  <AppIcon name="pencil" size={11} tintColor={themeColors['text-secondary']} />
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(400).delay(120).springify().damping(16)}
              style={styles.formSection}
            >
              <View style={{ opacity: isBusy ? 0.6 : 1 }}>
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
                <Text
                  testID="auth-otp-message"
                  accessibilityLiveRegion="polite"
                  style={[styles.errorText, { color: themeColors.destructive }]}
                >
                  {authError}
                </Text>
              ) : null}

              {/* Verify / resend primary button — animates in once 6 digits are entered */}
              <Animated.View
                style={[styles.verifyButtonWrap, verifyButtonStyle, { width: '100%' }]}
                pointerEvents={normalizedOtp.length === 6 ? 'auto' : 'none'}
              >
                <Button
                  testID="auth-verify-otp"
                  label={t.auth.verify.verifyButton}
                  onPress={() => void handleVerifyPress()}
                  disabled={isSubmitting || normalizedOtp.length !== 6}
                  variant="primary"
                />
              </Animated.View>

              <Pressable
                testID="auth-resend-otp"
                onPress={() => void handleResendPress()}
                disabled={isBusy || secondsLeft > 0}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.countdownPill,
                  {
                    backgroundColor: themeColors['card'],
                    opacity: pressed && secondsLeft === 0 ? 0.65 : 1,
                  },
                ]}
              >
                <AppIcon
                  name={secondsLeft === 0 ? 'arrow.clockwise' : 'clock'}
                  size={11}
                  tintColor={
                    secondsLeft === 0
                      ? themeColors.primary
                      : countdownColor(secondsLeft, themeColors)
                  }
                />
                <Text
                  style={[
                    styles.countdown,
                    {
                      color:
                        secondsLeft === 0 ? themeColors.primary : countdownColor(secondsLeft, themeColors),
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
