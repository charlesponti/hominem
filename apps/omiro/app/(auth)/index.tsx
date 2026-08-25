import type { RelativePathString } from 'expo-router';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { FeatureErrorBoundary } from '~/components/error-boundary/FeatureErrorBoundary';
import { makeStyles, useThemeColor } from '~/components/theme';
import { AnimatedCanvasButton } from '~/components/ui/animated-canvas-button';
import { Button } from '~/components/ui/button';
import { IconChip } from '~/components/ui/icon-chip';
import { TextField } from '~/components/ui/text-field';
import { CHAT_AUTH_CONFIG } from '~/config/auth';
import { useAuth } from '~/services/auth/auth-provider';
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

  const [textPrimary] = useThemeColor(['--color-foreground']) as string[];

  const getEmailProgress = () => {
    if (!email) return { stage: 0, message: 'Enter your email' };
    if (!email.includes('@')) return { stage: 1, message: 'Add the @ symbol' };
    const [_local, domain] = email.split('@');
    if (!domain) return { stage: 2, message: 'Almost there! Add the domain' };
    if (!domain.includes('.')) return { stage: 3, message: "Don't forget the domain extension" };
    const [_domainName, ext] = domain.split('.');
    if (!ext || ext.length < 2) return { stage: 4, message: 'Complete the domain extension' };
    return { stage: 5, message: 'Ready to go!' };
  };

  const progress = getEmailProgress();

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
      opacity: withTiming(progress.stage === 5 ? 1 : 0, { duration: 200 }),
    }),
    [progress.stage],
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

  const isProbing = isPending && !authError;
  const displayError = authError;

  if (isSignedIn) {
    return <Redirect href={CHAT_AUTH_CONFIG.defaultPostAuthDestination as RelativePathString} />;
  }

  return (
    <>
      <KeyboardAvoidingView style={styles.container} behavior="padding">
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
          <View style={styles.content}>
            <View style={styles.form}>
              <IconChip icon="envelope" />

              <View style={styles.header}>
                <Text style={styles.title}>{t.auth.emailEntry.title}</Text>
                {isProbing && <Text style={styles.restoringMessage}>{t.auth.restoringSignIn}</Text>}
              </View>

              {!isProbing ? (
                <View style={styles.inputContainer}>
                  <Animated.View style={shakeStyle}>
                    <TextField
                      testID="auth-email-input"
                      value={email}
                      placeholder={t.auth.emailEntry.emailPlaceholder}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      editable={!isSubmitting}
                      hasError={Boolean(displayError)}
                      cursorColor={textPrimary}
                      selectionColor={textPrimary}
                      style={{
                        opacity: isSubmitting ? 0.6 : 1,
                        lineHeight: 24,
                        paddingVertical: 0,
                      }}
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
                      style={styles.errorText}
                    >
                      {displayError}
                    </Text>
                  ) : null}

                  {/* Animated border + button container */}
                  <AnimatedCanvasButton
                    progress={progress.stage / 5}
                    style={styles.buttonContainer}
                  >
                    {/* Helper text, centered inside the animating border (stages 0-4) */}
                    {progress.stage < 5 && !displayError && (
                      <View style={styles.progressHelper}>
                        {progress.stage > 0 ? <Text style={styles.progressArrow}>↑</Text> : null}
                        <Text style={styles.progressMessage}>{progress.message}</Text>
                      </View>
                    )}

                    {/* Button (stage 5 only) */}
                    <Animated.View
                      style={[{ position: 'absolute', width: '100%' }, continueButtonStyle]}
                    >
                      <Button
                        testID="auth-send-otp"
                        label={t.auth.emailEntry.submitButton}
                        onPress={() => void handleSendCode()}
                        disabled={isSubmitting}
                        variant="primary"
                      />
                    </Animated.View>
                  </AnimatedCanvasButton>
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

const styles = makeStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { width: '100%', alignItems: 'center' },
  form: { width: '100%', maxWidth: 420, gap: 18 },
  header: { gap: 8 },
  title: { ...theme.typography.title1, color: theme.colors.foreground },
  restoringMessage: { ...theme.typography.subhead, color: theme.colors.mutedForeground },
  inputContainer: { gap: 12 },
  errorText: { ...theme.typography.footnote, color: theme.colors.destructive },
  buttonContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressHelper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  progressArrow: { ...theme.typography.footnote, color: theme.colors.mutedForeground },
  progressMessage: {
    ...theme.typography.footnote,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
}));
