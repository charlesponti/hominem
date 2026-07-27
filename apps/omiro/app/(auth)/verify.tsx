import { useEmailAuth } from '@hominem/auth/client/provider';
import { maskEmail } from '@hominem/auth/shared/mask-email';
import type { RelativePathString } from 'expo-router';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  withSequence,
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
import { Input } from '../../components/ui/input';
import { useAuth } from '../../services/auth/auth-provider';
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
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  countdown: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    marginLeft: 8,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
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
  const shakeStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateX: authError
            ? withSequence(
                withTiming(10, { duration: 50, easing: Easing.linear }),
                withTiming(-10, { duration: 50, easing: Easing.linear }),
                withTiming(7, { duration: 50, easing: Easing.linear }),
                withTiming(-7, { duration: 50, easing: Easing.linear }),
                withTiming(0, { duration: 50, easing: Easing.linear }),
              )
            : 0,
        },
      ],
    }),
    [authError],
  );
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
            <IconChip icon="lock.shield" />

            <View style={styles.copyBlock}>
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
            </View>

            <View style={styles.formSection}>
              <Animated.View style={shakeStyle}>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: themeColors['card'],
                      borderColor: authError
                        ? themeColors.destructive
                        : themeColors['border-default'],
                      opacity: isBusy ? 0.6 : 1,
                    },
                  ]}
                >
                  <Input
                    testID="auth-otp-input"
                    value={normalizedOtp}
                    placeholder={t.auth.verify.codePlaceholder}
                    placeholderTextColor={themeColors['tertiary']}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="done"
                    editable={!isBusy}
                    cursorColor={themeColors['text-primary']}
                    selectionColor={themeColors['text-primary']}
                    style={[styles.input, { borderWidth: 0, color: themeColors['text-primary'] }]}
                    onChangeText={(value) => {
                      setOtp(normalizeOtp(value));
                    }}
                    onSubmitEditing={() => {
                      if (normalizedOtp.length === 6) {
                        void handleVerifyPress();
                      }
                    }}
                    accessibilityLabel={t.auth.verify.oneTimeVerificationCodeA11y}
                  />
                  {secondsLeft === 0 ? (
                    <Text style={[styles.countdown, { color: themeColors.destructive }]}>
                      {t.auth.verify.expired}
                    </Text>
                  ) : (
                    <Text
                      style={[
                        styles.countdown,
                        { color: countdownColor(secondsLeft, themeColors) },
                      ]}
                      accessibilityLabel={t.auth.verify.timeRemainingA11y(secondsLeft)}
                    >
                      {formatCountdown(secondsLeft)}
                    </Text>
                  )}
                </View>
              </Animated.View>

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
                style={[styles.verifyButtonWrap, verifyButtonStyle]}
                pointerEvents={normalizedOtp.length === 6 ? 'auto' : 'none'}
              >
                {secondsLeft === 0 ? (
                  <Button
                    testID="auth-resend-otp-primary"
                    label={t.auth.verify.resendButton}
                    onPress={() => void handleResendPress()}
                    disabled={isBusy}
                    variant="primary"
                  />
                ) : (
                  <Button
                    testID="auth-verify-otp"
                    label={t.auth.verify.verifyButton}
                    onPress={() => void handleVerifyPress()}
                    disabled={isSubmitting || normalizedOtp.length !== 6}
                    variant="primary"
                  />
                )}
              </Animated.View>

              <View style={styles.tertiaryRow}>
                <Button
                  testID="auth-resend-otp"
                  label={t.auth.verify.resendButton}
                  onPress={() => void handleResendPress()}
                  disabled={isBusy}
                  variant="ghost"
                  size="sm"
                />
                <Button
                  label={t.auth.verify.changeEmailLink}
                  onPress={handleChangeEmail}
                  disabled={isBusy}
                  variant="ghost"
                  size="sm"
                />
              </View>
            </View>
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
