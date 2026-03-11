import { Redirect } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '~/components/Button';
import { FeedbackBlock } from '~/components/feedback-block';
import TextInput from '~/components/text-input';
import { Text, theme } from '~/theme';
import { useAuth } from '~/utils/auth-provider';

const Onboarding = () => {
  const { isSignedIn, currentUser, updateProfile, signOut } = useAuth();
  const [name, setName] = useState('');
  const [hasError, setHasError] = useState(false);

  const onButtonPress = async () => {
    if (!currentUser) return;
    try {
      setHasError(false);
      await updateProfile({ name });
    } catch {
      setHasError(true);
    }
  };

  if (!isSignedIn) {
    return <Redirect href={"/(auth)" as RelativePathString} />;
  }

  if (currentUser?.name) {
    return <Redirect href={"/(protected)/(tabs)/focus" as RelativePathString} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text variant="header" color="foreground">
            WELCOME
          </Text>
          <Text variant="label" color="mutedForeground">
            DEFINE PROFILE IDENTIFIER.
          </Text>
        </View>

        <TextInput
          aria-disabled
          label="Name"
          placeholder="Enter your name"
          value={name}
          style={styles.inputFlex}
          onChange={(e) => setName(e.nativeEvent.text)}
        />
        <Button title="Create profile" onPress={onButtonPress} />
        <Button testID="onboarding-sign-out" title="[SIGN_OUT]" onPress={signOut} />
        {hasError ? (
          <FeedbackBlock error>
            <Text variant="body" color="destructive">
              PROFILE WRITE FAILED.
            </Text>
          </FeedbackBlock>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: theme.spacing.ml_24,
    rowGap: theme.spacing.xl_48,
  },
  hero: {
    justifyContent: 'center',
    paddingTop: theme.spacing.ml_24,
    alignItems: 'center',
    marginBottom: theme.spacing.xl_48,
    rowGap: theme.spacing.sm_12,
  },
  inputFlex: {
    flex: 1,
  },
});

export default Onboarding;
