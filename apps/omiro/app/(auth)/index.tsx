import { TextField } from '@ponti-studios/ui/native';
import type { RelativePathString } from 'expo-router';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { FeatureErrorBoundary } from '~/components/error-boundary/FeatureErrorBoundary';
import { Button } from '~/components/ui/button';
import { IconChip } from '~/components/ui/icon-chip';
import { CHAT_AUTH_CONFIG } from '~/config/auth';
import { useAuth } from '~/services/auth/auth-provider';
import { resolveAuthScreenState } from '~/services/auth/auth-screen-state';
import { isValidEmail, normalizeEmail } from '~/services/auth/validation';
import { posthog } from '~/services/posthog';
import t from '~/translations';

function AuthScreen() {
  const { isPending, isSignedIn, requestEmailOtp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const normalizedEmail = normalizeEmail(email);
  const emailIsValid = isValidEmail(normalizedEmail);

  const [tertiary, destructive, borderDefault, textPrimary] = useCSSVariable([
    '--color-tertiary',
    '--color-destructive',
    '--color-border',
    '--color-foreground',
  ]) as string[];

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
  const continueButtonStyle = useAnimatedStyle(
    () => ({
      opacity: withTiming(emailIsValid ? 1 : 0, { duration: 36 }),
    }),
    [emailIsValid],
  );

  const handleSendCode = useCallback(async () => {
    posthog.capture('auth_send_code_pressed');
    if (!normalizedEmail) {
      setAuthError(t.auth.emailEntry.emailRequiredError);
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      posthog.capture('auth_email_invalid');
      setAuthError(t.auth.emailEntry.emailInvalidError);
      return;
    }

    try {
      setIsSubmitting(true);
      await requestEmailOtp(normalizedEmail);
      router.replace(
        `/(auth)/verify?email=${encodeURIComponent(normalizedEmail)}&sentAt=${Date.now()}` as RelativePathString,
      );
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : t.auth.emailEntry.sendFailedError);
    } finally {
      setIsSubmitting(false);
    }
  }, [normalizedEmail, requestEmailOtp, router]);

  if (isSignedIn) {
    return <Redirect href={CHAT_AUTH_CONFIG.defaultPostAuthDestination as RelativePathString} />;
  }

  const { isProbing, displayError } = resolveAuthScreenState({ isPending, authError });

  return (
    <>
      <KeyboardAvoidingView className="flex-1 bg-background" behavior="padding">
        <ScrollView
          testID="auth-screen"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 32,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full items-center">
            <View className="w-full max-w-[420px] gap-[18px]">
              <IconChip icon="envelope" />

              <View className="gap-2">
                <Text className="text-title1 text-foreground">{t.auth.emailEntry.title}</Text>
                <Text className="text-subhead text-muted-foreground">
                  {isProbing ? t.auth.restoringSignIn : t.auth.emailEntry.helper}
                </Text>
              </View>

              {!isProbing ? (
                <View className="gap-3">
                  <Animated.View style={shakeStyle}>
                    <TextField
                      testID="auth-email-input"
                      value={email}
                      placeholder={t.auth.emailEntry.emailPlaceholder}
                      placeholderTextColor={tertiary}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      editable={!isSubmitting}
                      cursorColor={textPrimary}
                      selectionColor={textPrimary}
                      style={{
                        borderColor: displayError ? destructive : borderDefault,
                        opacity: isSubmitting ? 0.6 : 1,
                      }}
                      className="bg-card text-foreground text-body min-h-12 border rounded-xl px-3.5 py-3"
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
                      accessibilityLabel={t.auth.emailEntry.emailLabel}
                    />
                  </Animated.View>

                  {displayError ? (
                    <Text
                      testID="auth-email-message"
                      accessibilityLiveRegion="polite"
                      className="text-footnote text-destructive"
                    >
                      {displayError}
                    </Text>
                  ) : null}

                  {/* Continue button — animates in when email is valid */}
                  <Animated.View
                    style={continueButtonStyle}
                    pointerEvents={emailIsValid ? 'auto' : 'none'}
                  >
                    <Button
                      testID="auth-send-otp"
                      label={t.auth.emailEntry.submitButton}
                      onPress={() => void handleSendCode()}
                      disabled={isSubmitting}
                      variant="primary"
                    />
                  </Animated.View>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const AuthWithErrorBoundary = () => (
  <FeatureErrorBoundary featureName="Auth">
    <AuthScreen />
  </FeatureErrorBoundary>
);

export default AuthWithErrorBoundary;
