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

import { FeatureErrorBoundary } from '~/components/error-boundary/FeatureErrorBoundary';
import { makeStyles, useThemeColors } from '~/components/theme';
import { Button } from '~/components/ui/button';
import { IconChip } from '~/components/ui/icon-chip';
import { TextField } from '~/components/ui/text-field';
import { CHAT_AUTH_CONFIG } from '~/config/auth';
import { useAuth } from '~/services/auth/auth-provider';
import { resolveAuthScreenState } from '~/services/auth/auth-screen-state';
import { isValidEmail, normalizeEmail } from '~/services/auth/validation';
import { posthog } from '~/services/posthog';
import t from '~/translations';

const useStyles = makeStyles(() => ({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
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
  helperText: {
    fontSize: 15,
    lineHeight: 20,
  },
  formSection: {
    gap: 12,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
}));

function AuthScreen() {
  const { isPending, isSignedIn, requestEmailOtp } = useAuth();
  const router = useRouter();
  const themeColors = useThemeColors();
  const styles = useStyles();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const normalizedEmail = normalizeEmail(email);
  const emailIsValid = isValidEmail(normalizedEmail);

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
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: themeColors['background'] }]}
        behavior="padding"
      >
        <ScrollView
          testID="auth-screen"
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentShell}>
            <View style={styles.card}>
              <IconChip icon="envelope" />

              <View style={styles.copyBlock}>
                <Text style={[styles.title, { color: themeColors['text-primary'] }]}>
                  {t.auth.emailEntry.title}
                </Text>
                <Text style={[styles.helperText, { color: themeColors['text-secondary'] }]}>
                  {isProbing ? t.auth.restoringSignIn : t.auth.emailEntry.helper}
                </Text>
              </View>

              {!isProbing ? (
                <View style={styles.formSection}>
                  <Animated.View style={shakeStyle}>
                    <TextField
                      testID="auth-email-input"
                      value={email}
                      placeholder={t.auth.emailEntry.emailPlaceholder}
                      placeholderTextColor={themeColors['tertiary']}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      editable={!isSubmitting}
                      cursorColor={themeColors['text-primary']}
                      selectionColor={themeColors['text-primary']}
                      style={[
                        styles.input,
                        {
                          backgroundColor: themeColors['card'],
                          borderColor: displayError
                            ? themeColors.destructive
                            : themeColors['border-default'],
                          color: themeColors['text-primary'],
                          opacity: isSubmitting ? 0.6 : 1,
                        },
                      ]}
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
                      style={[styles.errorText, { color: themeColors.destructive }]}
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
