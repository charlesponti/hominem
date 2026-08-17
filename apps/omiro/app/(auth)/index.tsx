import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import type { RelativePathString } from 'expo-router';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { FeatureErrorBoundary } from '~/components/error-boundary/FeatureErrorBoundary';
import { Button } from '~/components/ui/button';
import { IconChip } from '~/components/ui/icon-chip';
import { TextField } from '~/components/ui/text-field';
import { CHAT_AUTH_CONFIG } from '~/config/auth';
import { useAuth } from '~/services/auth/auth-provider';
import { isValidEmail, normalizeEmail } from '~/services/auth/validation';
import { posthog } from '~/services/posthog';
import t from '~/translations';

const BUTTON_HEIGHT = 44; // h-11
const BUTTON_BORDER_RADIUS = 6; // rounded-md

function AuthScreen() {
  const { isPending, isSignedIn, requestEmailOtp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [buttonWidth, setButtonWidth] = useState(0);
  const normalizedEmail = normalizeEmail(email);

  const [textPrimary, mutedForeground, primaryColor] = useCSSVariable([
    '--color-foreground',
    '--color-muted-foreground',
    '--color-primary',
  ]) as string[];

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

  const progress = useMemo(() => getEmailProgress(), [email]);

  // Rounded-rect path for the button outline, traced clockwise from top-left.
  const borderPath = useMemo(() => {
    if (buttonWidth === 0) return null;
    const path = Skia.Path.Make();
    path.addRRect(
      {
        rect: { x: 1, y: 1, width: buttonWidth - 2, height: BUTTON_HEIGHT - 2 },
        rx: BUTTON_BORDER_RADIUS,
        ry: BUTTON_BORDER_RADIUS,
      },
      false, // clockwise
    );
    return path;
  }, [buttonWidth]);

  // Continuous 0-1 draw progress, one step per email-completion stage.
  const drawProgress = useSharedValue(0);
  useEffect(() => {
    const stageProgress = [0, 0.2, 0.4, 0.6, 0.8, 1];
    drawProgress.value = withTiming(stageProgress[progress.stage], { duration: 350 });
  }, [progress.stage, drawProgress]);

  // Border color travels from muted to primary alongside the draw progress.
  const borderStrokeColor = useDerivedValue(() =>
    interpolateColor(drawProgress.value, [0, 1], [mutedForeground, primaryColor]),
  );

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

  const borderStyle = useAnimatedStyle(
    () => ({
      opacity: withTiming(progress.stage === 5 ? 0 : 1, { duration: 200 }),
    }),
    [progress.stage],
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

  if (isSignedIn) {
    return <Redirect href={CHAT_AUTH_CONFIG.defaultPostAuthDestination as RelativePathString} />;
  }

  const isProbing = useMemo(() => isPending && !authError, [isPending, authError]);
  const displayError = useMemo(() => !!authError, [authError]);

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
            <View className="w-full max-w-105 gap-4.5">
              <IconChip icon="envelope" />

              <View className="gap-2">
                <Text className="text-title1 text-foreground">{t.auth.emailEntry.title}</Text>
                {isProbing && (
                  <Text className="text-subhead text-muted-foreground">
                    {t.auth.restoringSignIn}
                  </Text>
                )}
              </View>

              {!isProbing ? (
                <View className="gap-3">
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
                      hasError={displayError}
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
                      className="text-footnote text-destructive"
                    >
                      {displayError}
                    </Text>
                  ) : null}

                  {/* Animated border + button container */}
                  <View
                    className="relative w-full items-center justify-center"
                    style={{ height: BUTTON_HEIGHT }}
                    onLayout={(e) => setButtonWidth(e.nativeEvent.layout.width)}
                  >
                    {/* Clockwise-drawing border (stages 0-4) */}
                    {progress.stage < 5 && borderPath && (
                      <Animated.View
                        style={[
                          { position: 'absolute', width: buttonWidth, height: BUTTON_HEIGHT },
                          borderStyle,
                        ]}
                        pointerEvents="none"
                      >
                        <Canvas style={{ width: buttonWidth, height: BUTTON_HEIGHT }}>
                          <Path
                            path={borderPath}
                            style="stroke"
                            strokeWidth={2}
                            strokeCap="round"
                            color={borderStrokeColor}
                            start={0}
                            end={drawProgress}
                          />
                        </Canvas>
                      </Animated.View>
                    )}

                    {/* Helper text, centered inside the animating border (stages 0-4) */}
                    {progress.stage < 5 && !displayError && (
                      <View className="flex-row items-center justify-center gap-1.5 px-4">
                        {progress.stage > 0 ? (
                          <Text className="text-footnote text-muted-foreground">↑</Text>
                        ) : null}
                        <Text className="text-footnote text-muted-foreground text-center">
                          {progress.message}
                        </Text>
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
                  </View>
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
