import { TextField } from '@ponti-studios/ui/native';
import type { RelativePathString } from 'expo-router';
import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { Button } from '~/components/ui/button';
import { useAuth } from '~/services/auth/auth-provider';
import { HOME_ROUTE } from '~/services/navigation/routes';
import t from '~/translations';

const Onboarding = () => {
  const { isSignedIn, currentUser, updateProfile, signOut } = useAuth();
  const [tertiary, destructive, textPrimary, textSecondary, borderDefault] = useCSSVariable([
    '--color-tertiary',
    '--color-destructive',
    '--color-foreground',
    '--color-muted-foreground',
    '--color-border',
  ]) as string[];
  const [name, setName] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveName = async (nextName: string) => {
    if (!currentUser) return;
    await updateProfile({ name: nextName.trim() });
  };

  const onButtonPress = async () => {
    if (!currentUser || isSubmitting) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setHasError(true);
      return;
    }

    try {
      setIsSubmitting(true);
      setHasError(false);
      await saveName(trimmedName);
    } catch {
      setHasError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSkipPress = async () => {
    if (!currentUser || isSubmitting) return;
    const fallbackName = currentUser.email?.split('@')[0] || 'Omiro user';
    try {
      setIsSubmitting(true);
      setHasError(false);
      await saveName(fallbackName);
    } catch {
      setHasError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSignedIn) {
    return <Redirect href={'/(auth)' as RelativePathString} />;
  }

  if (currentUser?.name) {
    return <Redirect href={HOME_ROUTE} />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Welcome' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingVertical: 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[480px] self-center gap-6">
          <View className="gap-2.5">
            <Text className="text-[28px] font-bold leading-[34px] text-foreground">
              {t.onboarding.title}
            </Text>
            <Text className="text-base leading-[22px] text-muted-foreground">
              {t.onboarding.subtitle}
            </Text>
          </View>

          <View className="gap-3">
            <TextField
              value={name}
              placeholder={t.onboarding.namePlaceholder}
              placeholderTextColor={tertiary}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isSubmitting}
              returnKeyType="done"
              cursorColor={textPrimary}
              selectionColor={textPrimary}
              className="bg-card text-foreground"
              style={[
                {
                  minHeight: 48,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                  borderColor: hasError ? destructive : borderDefault,
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
              onChangeText={(text) => {
                setName(text);
                setHasError(false);
              }}
              onSubmitEditing={() => void onButtonPress()}
            />

            {hasError ? (
              <Text className="text-[13px] leading-[18px] text-destructive">
                {t.onboarding.nameError}
              </Text>
            ) : null}

            <Button
              label={t.onboarding.start}
              onPress={() => void onButtonPress()}
              disabled={isSubmitting}
              variant="primary"
            />

            <Button
              label={t.onboarding.continueWithoutName}
              onPress={() => void onSkipPress()}
              disabled={isSubmitting}
              variant="ghost"
            />

            <Button
              testID="onboarding-sign-out"
              label={t.onboarding.signOut}
              onPress={() => void signOut()}
              disabled={isSubmitting}
              variant="ghost"
            />
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default Onboarding;
