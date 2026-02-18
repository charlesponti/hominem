import * as Sentry from '@sentry/react-native';
import { Stack } from 'expo-router';

function SherpaStack() {
  return (
    <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </Sentry.ErrorBoundary>
  );
}

export default SherpaStack;
