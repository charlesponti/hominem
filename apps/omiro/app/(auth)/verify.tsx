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
import { useCSSVariable } from 'uniwind';

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

function countdownColor(
  secondsLeft: number,
  destructive: string,
  warning: string,
  textSecondary: string,
) {
  if (secondsLeft === 0 || secondsLeft < 20) return destructive;
  if (secondsLeft < 60) return warning;
  return textSecondary;
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

  const [primary, destructive, warning, textSecondary, success] = useCSSVariable([
    '--color-primary',
    '--color-destructive',
    '--color-warning',
    '--color-muted-foreground',
    '--color-success',
  ]) as string[];

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
      <View className="flex-1 items-center justify-center bg-background">
        <Animated.View entering={FadeIn.duration(300)} className="items-center gap-4">
          <IconChip
            icon="checkmark.circle.fill"
            size={72}
            radius={24}
            iconSize={32}
            tintColor={success}
          />
          <Text className="text-title2 text-foreground">{t.auth.verify.signedIn}</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior="padding">
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
        <View className="w-full items-center">
          <View className="w-full max-w-[420px] gap-[18px]">
            <Animated.View entering={FadeInDown.duration(400).springify().damping(16)}>
              <IconChip icon="lock.shield" />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(400).delay(60).springify().damping(16)}
              className="gap-2"
            >
              <Text className="text-title1 text-foreground">{t.auth.verify.title}</Text>
              <View className="flex-row items-center flex-wrap gap-1.5">
                <Text className="text-subhead text-muted-foreground">
                  {t.auth.verify.codeSentTo}
                </Text>
                <Pressable
                  hitSlop={8}
                  onPress={handleChangeEmail}
                  style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}
                  className="flex-row items-center gap-1 px-2 py-[3px] rounded-lg bg-card"
                >
                  <Text className="text-body font-medium text-foreground">
                    {maskEmail(resolvedEmail)}
                  </Text>
                  <AppIcon name="pencil" size={11} tintColor={textSecondary} />
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(400).delay(120).springify().damping(16)}
              className="gap-4 items-center"
            >
              <View className={isBusy ? 'opacity-60' : ''}>
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
                  className="text-footnote text-center text-destructive"
                >
                  {authError}
                </Text>
              ) : null}

              {/* Verify / resend primary button — animates in once 6 digits are entered */}
              <Animated.View
                style={[verifyButtonStyle]}
                className="overflow-hidden w-full"
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
                style={({ pressed }) => [{ opacity: pressed && secondsLeft === 0 ? 0.65 : 1 }]}
                className="flex-row items-center self-center gap-[5px] px-2.5 py-1 rounded-full bg-card"
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
                  className="text-caption1 font-semibold tabular-nums"
                  style={{
                    color:
                      secondsLeft === 0
                        ? primary
                        : countdownColor(secondsLeft, destructive, warning, textSecondary),
                  }}
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
