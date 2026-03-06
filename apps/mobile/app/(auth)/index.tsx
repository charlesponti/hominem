import { Redirect } from 'expo-router';
import React from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeatureErrorBoundary } from '~/components/error-boundary';
import LoginSheet from '~/components/authentication/login-sheet';
import { Box, Text } from '~/theme';
import { useAuth } from '~/utils/auth-provider';

function Auth() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Redirect href="/(drawer)/(tabs)/start" />;
  }

  return (
    <SafeAreaView edges={['top', 'right', 'bottom', 'left']} style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          bounces={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Box flex={1} testID="auth-screen" style={styles.screen}>
            <View style={styles.hero}>
              <Image source={require('~/assets/icon.png')} style={styles.logo} />
              <Text variant="header" color="foreground" style={styles.title}>
                WELCOME
              </Text>
              <Text variant="body" color="mutedForeground" style={styles.subtitle}>
                Sign in with your email and one-time code.
              </Text>
            </View>
            <LoginSheet />
          </Box>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  screen: {
    backgroundColor: '#000000',
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    rowGap: 24,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 14,
  },
  logo: {
    width: 96,
    height: 96,
    maxWidth: 96,
    maxHeight: 96,
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  },
  title: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  },
});

const AuthWithErrorBoundary = () => (
  <FeatureErrorBoundary featureName="Auth">
    <Auth />
  </FeatureErrorBoundary>
)

export default AuthWithErrorBoundary
