import type { RelativePathString } from 'expo-router';
import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { makeStyles, useThemeColor, withAlpha } from '~/components/theme';
import { TextField } from '~/components/ui';
import { Button } from '~/components/ui/button';
import { useAuth } from '~/services/auth/auth-provider';
import { HOME_ROUTE } from '~/services/navigation/routes';
import t from '~/translations';

const Onboarding = () => {
  const { isSignedIn, currentUser, updateProfile, signOut } = useAuth();
  const [destructive, textPrimary, borderDefault] = useThemeColor([
    '--color-destructive',
    '--color-foreground',
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
        <View style={styles.form}>
          <View style={styles.header}>
            <Text style={styles.title}>{t.onboarding.title}</Text>
            <Text style={styles.subtitle}>{t.onboarding.subtitle}</Text>
          </View>

          <View style={styles.inputContainer}>
            <TextField
              value={name}
              placeholder={t.onboarding.namePlaceholder}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isSubmitting}
              returnKeyType="done"
              cursorColor={textPrimary}
              selectionColor={textPrimary}
              style={[
                styles.input,
                [
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
                ],
              ]}
              onChangeText={(text) => {
                setName(text);
                setHasError(false);
              }}
              onSubmitEditing={() => void onButtonPress()}
            />

            {hasError ? <Text style={styles.errorText}>{t.onboarding.nameError}</Text> : null}

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

const styles = makeStyles((theme) => ({
  form: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 24 },
  header: { gap: 10 },
  title: { fontSize: 28, fontWeight: '700', lineHeight: 34, color: theme.colors.foreground },
  subtitle: { lineHeight: 22, color: theme.colors.mutedForeground },
  inputContainer: { gap: 12 },
  input: { backgroundColor: theme.colors.card, color: theme.colors.foreground },
  errorText: { fontSize: 13, lineHeight: 18, color: theme.colors.destructive },
}));
